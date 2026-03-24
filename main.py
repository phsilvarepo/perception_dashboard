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
    """Opens a bag file and returns the topics and types inside it."""
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"File not found: {path}")

    try:
        # Check if it's a directory (db3) or file (mcap)
        storage_id = "mcap" if path.endswith(".mcap") else "sqlite3"
        
        reader = rosbag2_py.SequentialReader()
        storage_options, converter_options = get_rosbag_options(path, storage_id)
        reader.open(storage_options, converter_options)
        
        topic_types = reader.get_all_topics_and_types()
        
        return [
            {"name": topic.name, "type": topic.type} 
            for topic in topic_types
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read bag: {str(e)}")

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
    # 1. Load catalog...
    with open("nodes.json", "r") as f:
        catalog = json.load(f)
    
    node_template = next((n for n in catalog if n["id"] == node_id), None)
    if not node_template:
        raise HTTPException(status_code=404, detail="Node template not found")

    try:
        image_name = node_template["image"]
        
        # 2. Check if image exists locally, if not, pull it
        try:
            client.images.get(image_name)
        except docker.errors.ImageNotFound:
            print(f"Image {image_name} not found locally. Pulling from public registry...")
            # This works for any PUBLIC GHCR or Docker Hub image
            client.images.pull(image_name)

        # 3. Run the container using the image from the JSON
        container = client.containers.run(
            image=node_template["image"],
            detach=True,
            network_mode="host",
            environment={
                "INPUT_TOPIC": config.get("input_topic"),
                "MODEL": node_template["params"]["default_model"]
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

@app.post("/stop/{container_name}")
async def stop_task(container_name: str):
    try:
        container = client.containers.get(container_name)
        container.stop()
        container.remove()
        return {"status": "stopped"}
    except Exception as e:
        raise HTTPException(status_code=404, detail="Container not found")