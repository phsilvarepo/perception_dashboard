# Use the official ROS2 Humble base image
FROM ros:humble-ros-base 

# 1. Install system dependencies and ROS2 Python bindings
# ADDED: ros-humble-rosbag2-storage-mcap
RUN apt-get update && apt-get install -y \
    python3-pip \
    ros-humble-rosbag2-py \
    ros-humble-rosbag2-storage-mcap \
    && rm -rf /var/lib/apt/lists/*

# 2. Install Python web and docker libraries
RUN pip3 install --no-cache-dir fastapi uvicorn docker

WORKDIR /app

# 3. Copy your backend logic
COPY ./main.py ./nodes.json ./

# 4. Use a shell form for CMD to ensure ROS environment is sourced
CMD ["/bin/bash", "-c", "source /opt/ros/humble/setup.bash && uvicorn main:app --host 0.0.0.0 --port 8000"]
