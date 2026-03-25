import docker
import os  
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import rosbag2_py
from pathlib import Path
import rclpy             
from rclpy.node import Node
import json

# --- ROS2 Initialization ---
# This needs to happen once when the container starts
try:
    rclpy.init()
    # We create a simple node that stays alive to query the graph
    discovery_node = Node('dashboard_backend_discovery')
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
    """Queries the ROS2 graph for all currently active topics."""
    try:
        # get_topic_names_and_types returns: [('/topic_name', ['type/name']), ...]
        topic_data = discovery_node.get_topic_names_and_types()
        
        # Format it for your React frontend
        return [
            {"name": name, "type": types[0]} 
            for name, types in topic_data
        ]
    except Exception as e:
        # If ROS2 fails, return an empty list so the UI doesn't crash
        print(f"ROS2 Discovery Error: {e}")
        return []

# Helper for ROSbag Inspection
def get_rosbag_options(uri, storage_id):
    storage_options = rosbag2_py.StorageOptions(uri=uri, storage_id=storage_id)
    converter_options = rosbag2_py.ConverterOptions(
        input_serialization_format='cdr',
        output_serialization_format='cdr')
    return storage_options, converter_options

@app.get("/api/inspect_bag")
async def inspect_bag(path: str):
    # 1. Normalize the path (ensure it's absolute for the container)
    absolute_path = os.path.abspath(path)
    
    if not os.path.exists(absolute_path):
        raise HTTPException(status_code=404, detail=f"Path not found: {absolute_path}")

    try:
        # 2. Better Storage Detection
        # .mcap is a file, .db3 is usually inside a folder with a metadata.yaml
        if absolute_path.endswith(".mcap"):
            storage_id = "mcap"
            uri = absolute_path
        else:
            storage_id = "sqlite3"
            # If they picked the .db3 file, we actually want the parent directory 
            # where the metadata.yaml lives
            uri = os.path.dirname(absolute_path) if absolute_path.endswith(".db3") else absolute_path

        reader = rosbag2_py.SequentialReader()
        
        storage_options = rosbag2_py.StorageOptions(uri=uri, storage_id=storage_id)
        converter_options = rosbag2_py.ConverterOptions(
            input_serialization_format='cdr',
            output_serialization_format='cdr'
        )
        
        reader.open(storage_options, converter_options)
        
        # 3. Get metadata
        topic_types = reader.get_all_topics_and_types()
        
        # Format for Frontend
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
    """Reads the local JSON catalog and returns available node templates."""
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
        # --- PART A: Handle ROSbag Player ---
        if config.get("source_type") == "bag":
            print("Creating container to play the bag using registry image!")
            bag_path = config.get("bag_path")
            bag_dir = os.path.dirname(bag_path)
            
            # 1. Use YOUR registry image here
            player_image = "ghcr.io/phsilvarepo/rosbag-player-mcap:latest"
            
            client.containers.run(
                image=player_image, 
                command=f"ros2 bag play \"{bag_path}\" --loop",
                network_mode="host",
                detach=True,
                volumes={bag_dir: {'bind': bag_dir, 'mode': 'rw'}},
                labels={"managed_by": "perception_dashboard", "role": "player"}
            )
        # --- PART B: Launch Perception Worker ---
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
    """Helpful endpoint for your FileBrowser component"""
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
        # 1. Stop the main worker container
        worker = client.containers.get(container_id)
        worker.stop()
        worker.remove()
        
        # 2. Cleanup ANY orphaned bag players left behind by this dashboard
        # This keeps your 'ros2 topic list' from getting cluttered
        orphans = client.containers.list(filters={"label": "role=player"})
        for player in orphans:
            player.stop()
            # remove=True was set in start_node, so it will delete itself
            
        return {"status": "stopped_all"}
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Cleanup error: {e}")