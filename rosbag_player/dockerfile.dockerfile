# Use the official Humble base
FROM ros:humble-ros-base

# Install the MCAP storage plugin
RUN apt-get update && apt-get install -y \
    ros-humble-rosbag2-storage-mcap \
    && rm -rf /var/lib/apt/lists/*

# Set the entrypoint to source ROS automatically
ENTRYPOINT ["/bin/bash", "-c", "source /opt/ros/humble/setup.bash && \"$@\"", "--"]

# Default command if none provided
CMD ["ros2", "bag", "--help"]