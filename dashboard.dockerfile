# Use the official ROS2 Humble base image
FROM ros:humble-ros-base 

# 1. Install system dependencies
RUN apt-get update && apt-get install -y \
    python3-pip \
    python3-opencv \
    ros-humble-cv-bridge \
    ros-humble-rosbag2-py \
    ros-humble-rosbag2-storage-mcap \
    ros-humble-rosbag2-storage-default-plugins \
    ros-humble-rosidl-default-generators \
    ros-humble-std-msgs \
    && rm -rf /var/lib/apt/lists/*

# 2. Install Python web and docker libraries
RUN pip3 install --no-cache-dir fastapi uvicorn docker

# --- NEW SECTION: Build Custom Interfaces ---
WORKDIR /ros_ws/src
# Copy the interface folder into the workspace
COPY ./ocr_interfaces ./ocr_interfaces

WORKDIR /ros_ws
# Build only the interfaces
RUN /bin/bash -c "source /opt/ros/humble/setup.bash && colcon build --packages-select ocr_interfaces"
# --------------------------------------------

WORKDIR /app

ENV FASTDDS_BUILTIN_TRANSPORTS=UDPv4

# 3. Copy your backend logic
COPY ./main.py ./nodes.json ./

# 4. CRITICAL: Source BOTH ROS2 and your local workspace
CMD ["/bin/bash", "-c", "source /opt/ros/humble/setup.bash && source /ros_ws/install/setup.bash && uvicorn main:app --host 0.0.0.0 --port 8000"]
