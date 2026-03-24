import docker
import os  # Added missing import
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import rosbag2_py
from pathlib import Path

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = docker.from_env()

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

@app.post("/start/{task_id}")
async def start_task(
    task_id: str, 
    input_topic: str = "/rgb", 
    source_type: str = "topic", 
    bag_path: str = ""
):
    """
    Tells Docker to spin up the worker image.
    If source_type is 'bag', the container needs to know the bag_path.
    """
    container_name = f"worker_{task_id}_{os.urandom(2).hex()}"
    
    config = {
        "obj_det": {"image": "yolo_worker:latest", "model": "yolo11n.pt"},
        "obj_seg": {"image": "seg_worker:latest", "model": "leaf_seg.pt"},
        "lidar_proc": {"image": "lidar_worker:latest", "model": "default.pt"}
    }
    
    task = config.get(task_id, config["obj_det"])

    try:
        # We mount the host directory so the Docker container can access the bag file
        volumes = {}
        if source_type == "bag" and bag_path:
            # Mount the directory containing the bag into the container
            bag_dir = str(Path(bag_path).parent)
            volumes[bag_dir] = {'bind': '/mnt/bags', 'mode': 'ro'}
            # Update path to be relative to container mount
            bag_path = f"/mnt/bags/{os.path.basename(bag_path)}"

        container = client.containers.run(
            image=task["image"],
            name=container_name,
            detach=True,
            network_mode="host",
            volumes=volumes, # Added volume mounting for bags
            environment={
                "YOLO_MODEL": task["model"],
                "SOURCE_TYPE": source_type,
                "BAG_PATH": bag_path,
                "INPUT_TOPIC": input_topic,
                "OUTPUT_TOPIC": f"/{container_name}/output"
            }
        )
        return {"status": "success", "container_id": container.id, "name": container_name}
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