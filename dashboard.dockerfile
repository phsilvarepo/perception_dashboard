# Use a ROS2 Humble base (or whichever version you use)
FROM ros:humble-ros-base 

# 1. Install Python dependencies + ROS2 Python bindings
RUN apt-get update && apt-get install -y \
    python3-pip \
    python3-rosbag2-py \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install --no-cache-dir fastapi uvicorn docker

WORKDIR /app

COPY ./main.py .

# 2. Source ROS2 in the entrypoint so the API can see topics
# We use 'bash -c' to ensure the ROS environment is active
CMD ["bash", "-c", "source /opt/ros/humble/setup.bash && uvicorn main:app --host 0.0.0.0 --port 8000"]