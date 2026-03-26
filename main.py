import docker
import os  
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import rosbag2_py
from pathlib import Path
import rclpy             
from rclpy.node import Node
import json
import cv2
from cv_bridge import CvBridge
from sensor_msgs.msg import Image
from fastapi.responses import StreamingResponse
import threading
import asyncio
from rclpy.qos import QoSProfile, ReliabilityPolicy, HistoryPolicy
from rclpy.executors import MultiThreadedExecutor
from rclpy.callback_groups import ReentrantCallbackGroup

bridge = CvBridge()
latest_frames = {}
active_subscriptions = set()  # Track subscribed topics to avoid duplicates

try:
    rclpy.init()
    discovery_node = Node('dashboard_backend_discovery')
    callback_group = ReentrantCallbackGroup()
    
    def spin_node():
        executor = MultiThreadedExecutor()
        executor.add_node(discovery_node)
        executor.spin()
    
    thread = threading.Thread(target=spin_node, daemon=True)
    thread.start()
except Exception as e:
    print(f"ROS2 init error: {e}")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = docker.from_env()

@app.get("/api/topics")
async def get_topics():
    try:
        topic_data = discovery_node.get_topic_names_and_types()
        return [
            {"name": name, "type": types[0]} 
            for name, types in topic_data
        ]
    except Exception as e:
        print(f"ROS2 Discovery Error: {e}")
        return []

def get_rosbag_options(uri, storage_id):
    storage_options = rosbag2_py.StorageOptions(uri=uri, storage_id=storage_id)
    converter_options = rosbag2_py.ConverterOptions(
        input_serialization_format='cdr',
        output_serialization_format='cdr')
    return storage_options, converter_options

@app.get("/api/inspect_bag")
async def inspect_bag(path: str):
    absolute_path = os.path.abspath(path)
    
    if not os.path.exists(absolute_path):
        raise HTTPException(status_code=404, detail=f"Path not found: {absolute_path}")

    try:
        if absolute_path.endswith(".mcap"):
            storage_id = "mcap"
            uri = absolute_path
        else:
            storage_id = "sqlite3"
            uri = os.path.dirname(absolute_path) if absolute_path.endswith(".db3") else absolute_path

        reader = rosbag2_py.SequentialReader()
        
        storage_options = rosbag2_py.StorageOptions(uri=uri, storage_id=storage_id)
        converter_options = rosbag2_py.ConverterOptions(
            input_serialization_format='cdr',
            output_serialization_format='cdr'
        )
        
        reader.open(storage_options, converter_options)
        topic_types = reader.get_all_topics_and_types()
        
        result = [
            {"name": topic.name, "type": topic.type} 
            for topic in topic_types
        ]
        
        print(f"Successfully inspected {storage_id} bag. Found {len(result)} topics.")
        return result

    except Exception as e:
        print(f"Detailed Bag Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"ROS2 Bag Error: {str(e)}")

@app.get("/api/node-repository")
async def get_node_repository():
    try:
        with open("nodes.json", "r") as f:
            data = json.load(f)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail="Could not load node catalog")

@app.post("/start/{node_id}")
async def start_node(node_id: str, config: dict):
    with open("nodes.json", "r") as f:
        catalog = json.load(f)
    
    node_template = next((n for n in catalog if n["id"] == node_id), None)
    if not node_template:
        raise HTTPException(status_code=404, detail="Node template not found")

    try:
        if config.get("source_type") == "bag":
            bag_path = config.get("bag_path")
            bag_dir = os.path.dirname(bag_path)
            
            player_image = "ghcr.io/phsilvarepo/rosbag-player-mcap:latest"
            docker_command = (
                f"bash -c 'source /opt/ros/humble/setup.bash && "
                f"ros2 bag play \"{bag_path}\" --loop'"
            )
            
            client.containers.run(
                image=player_image, 
                command=docker_command,
                network_mode="host",
                ipc_mode="host",
                pid_mode="host",
                detach=True,
                volumes={bag_dir: {'bind': bag_dir, 'mode': 'rw'}},
                labels={"managed_by": "perception_dashboard", "role": "player"}
            )

        container = client.containers.run(
            image=node_template["image"],
            detach=True,
            network_mode="host",
            environment={
                "YOLO_INPUT_TOPIC": config.get("input_topic"),
                "YOLO_MODEL": config.get("model", node_template["params"]["default_model"]),
                "YOLO_OUTPUT_TOPIC": "/yolo/detections_image",
            },
            labels={"managed_by": "perception_dashboard", "node_type": node_id}
        )
        return {"status": "success", "id": container.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/explore")
async def explore_path(path: str = "/home"):
    try:
        target = Path(path)
        items = []
        for item in target.iterdir():
            try:
                items.append({
                    "name": item.name,
                    "path": str(item.absolute()),
                    "is_dir": item.is_dir(),
                    "is_bag": item.suffix in ['.mcap', '.db3', '.bag']
                })
            except PermissionError: continue
        return sorted(items, key=lambda x: (not x['is_dir'], x['name']))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/stop/{container_id}")
async def stop_task(container_id: str):
    try:
        worker = client.containers.get(container_id)
        worker.stop()
        worker.remove()
        
        orphans = client.containers.list(filters={"label": "role=player"})
        for player in orphans:
            player.stop()
            
        return {"status": "stopped_all"}
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Cleanup error: {e}")

@app.post("/pause/{container_id}")
async def pause_node(container_id: str):
    try:
        container = client.containers.get(container_id)
        container.pause()
        return {"status": "paused"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/resume/{container_id}")
async def resume_node(container_id: str):
    try:
        container = client.containers.get(container_id)
        container.unpause()
        return {"status": "resumed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/fleet")
async def get_fleet():
    try:
        containers = client.containers.list(all=True, filters={"label": "managed_by=perception_dashboard"})
        fleet = []
        for c in containers:
            if c.labels.get("role") == "player": continue
            
            env = c.attrs['Config']['Env']
            model = next((v.split('=')[1] for v in env if "YOLO_MODEL" in v), "N/A")
            output = next((v.split('=')[1] for v in env if "YOLO_OUTPUT_TOPIC" in v), "/results")
            input_t = next((v.split('=')[1] for v in env if "YOLO_INPUT_TOPIC" in v), "/image_raw")

            fleet.append({
                "id": c.id,
                "name": c.name,
                "type": c.labels.get("node_type", "Perception"),
                "weights": model,
                "input_topic": input_t,
                "output_topic": output,
                "status": c.status.capitalize(),
                "container_id": c.short_id
            })
        return fleet
    except: return []

def image_callback(msg, topic_name):
    print(f"Received frame from {topic_name}!")
    try:
        cv_image = bridge.imgmsg_to_cv2(msg, desired_encoding='bgr8')
        
        height, width = cv_image.shape[:2]
        if width > 640:
            scale = 640 / width
            cv_image = cv2.resize(cv_image, (0,0), fx=scale, fy=scale)

        encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 80]
        _, buffer = cv2.imencode('.jpg', cv_image, encode_param)
        
        latest_frames[topic_name] = buffer.tobytes()
    except Exception as e:
        print(f"Stream conversion error on {topic_name}: {e}")

@app.get("/api/stream")
async def stream_topic(topic: str):
    full_topic = f"/{topic.lstrip('/')}"
    
    if full_topic not in active_subscriptions:
        # Detect publisher QoS to avoid RELIABLE/BEST_EFFORT mismatch
        try:
            publisher_info = discovery_node.get_publishers_info_by_topic(full_topic)
            if publisher_info:
                pub_reliability = publisher_info[0].qos_profile.reliability
                print(f"Matched publisher QoS for {full_topic}: {pub_reliability}")
            else:
                # No publisher visible yet — default to RELIABLE (ros2 bag play uses this)
                pub_reliability = ReliabilityPolicy.RELIABLE
                print(f"No publisher found for {full_topic}, defaulting to RELIABLE")
        except Exception as e:
            pub_reliability = ReliabilityPolicy.RELIABLE
            print(f"QoS detection failed for {full_topic}: {e}, defaulting to RELIABLE")

        qos_profile = QoSProfile(
            reliability=pub_reliability,
            history=HistoryPolicy.KEEP_LAST,
            depth=1
        )

        # Fix: capture full_topic by value in lambda to avoid closure bug
        discovery_node.create_subscription(
            Image, 
            full_topic, 
            lambda msg, t=full_topic: image_callback(msg, t),
            qos_profile,
            callback_group=callback_group
        )
        active_subscriptions.add(full_topic)
        print(f"Subscribed to: {full_topic}")

    async def generate():
        last_sent_frame = None
        while True:
            frame = latest_frames.get(full_topic)
            if frame and frame != last_sent_frame:
                last_sent_frame = frame
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
                await asyncio.sleep(0.03)
            else:
                await asyncio.sleep(0.1)

    return StreamingResponse(generate(), media_type="multipart/x-mixed-replace; boundary=frame")