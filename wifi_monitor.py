import subprocess
import re
import time
import requests
import platform



CHECK_INTERVAL = 10  # Seconds between checks

# Track connected devices
connected_devices = {}
registered_macs = set()  # Store registered MAC addresses

def fetch_registered_macs():
    """Fetch the list of registered MAC addresses from the student collection"""
    global registered_macs
    try:
        response = requests.get(DB_URL, timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"Fetched MAC response: {data}")  # Debugging log

            # Ensure data["macAddress"] is treated as a list
            if isinstance(data["macAddress"], list):
                registered_macs = {mac.lower().replace("-", ":") for mac in data["macAddress"]}
            else:
                print("Unexpected response format!")
                registered_macs = set()

            print(f"Registered MACs (Normalized): {registered_macs}")
        else:
            print(f"Failed to fetch registered MACs: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"Error fetching registered MACs: {str(e)}")

def get_wifi_rssi():
    """Fetch RSSI values for connected devices using netsh command"""
    try:
        result = subprocess.run(
            ["netsh", "wlan", "show", "networks", "mode=bssid"],
            capture_output=True,
            text=True,
            check=True
        )
        output = result.stdout
        rssi_values = {}
        current_mac = None
        
        for line in output.splitlines():
            if "BSSID" in line:
                current_mac = line.split(":")[1].strip().replace("-", ":")
            if "Signal" in line and current_mac:
                rssi = int(line.split(":")[1].strip().replace("%", ""))
                rssi_values[current_mac] = rssi
                current_mac = None

        return rssi_values
    except subprocess.CalledProcessError as e:
        print(f"Error fetching RSSI values: {e}")
        return {}

def get_connected_devices():
    """Fetch connected devices using ARP table"""
    try:
        if platform.system() == "Windows":
            rssi_values = get_wifi_rssi()
            result = subprocess.run(["arp", "-a"], capture_output=True, text=True, check=True)
            output = result.stdout
            devices = []
            current_devices = set()

            for line in output.splitlines():
                match = re.search(r"([0-9A-Fa-f]{2}(-[0-9A-Fa-f]{2}){5})", line)
                if match:
                    mac = match.group(1)
                    mac_colon = mac.replace("-", ":").lower()

                    # Print detected MACs
                    print(f"Detected Device MAC: {mac_colon}")

                    if mac_colon not in registered_macs:
                        print(f"❌ Ignoring Unregistered MAC: {mac_colon}")
                        continue

                    rssi = rssi_values.get(mac_colon, -1)
                    devices.append({"mac_address": mac_colon, "rssi": rssi})

            print(f"✅ Active Registered Devices: {devices}")
            return devices
        else:
            print("Unsupported OS")
            return []
    except subprocess.CalledProcessError as e:
        print(f"Error fetching ARP table: {e}")
        return []

def send_to_server(device):
    """Send only registered MAC addresses' data to the backend"""
    try:
        formatted_mac = device["mac_address"].lower().replace(":", "-")
        print(f"📤 Sending MAC: {formatted_mac}")

        response = requests.post(
            SERVER_URL,
            json={
                "macAddress": formatted_mac,
                "rssiValue": device["rssi"]
            },
            timeout=5
        )

        if response.status_code == 200:
            print(f"✅ Success: {formatted_mac} processed")
        else:
            print(f"❌ Server error: {response.status_code} - {response.text}")
    except requests.exceptions.RequestException as e:
        print(f"Error sending data to server: {str(e)}")

def monitor_devices():
    """Main monitoring loop"""
    print("Starting WiFi device monitoring...")
    print(f"Server URL: {SERVER_URL}")
    print("Fetching registered MAC addresses...")
    fetch_registered_macs()  # Fetch registered MAC addresses at the start
    print("Checking connected devices against registered MACs...")

    print("Press Ctrl+C to stop monitoring")

    try:
        while True:
            devices = get_connected_devices()
            if devices:
                print(f"Found {len(devices)} active registered devices")
                for device in devices:
                    print(f"Processing: {device['mac_address']} (RSSI: {device['rssi']}%)")
                    send_to_server(device)
            else:
                print("No active registered devices found")
            
            time.sleep(CHECK_INTERVAL)
    except KeyboardInterrupt:
        print("\nMonitoring stopped")

if __name__ == "_main_":
    monitor_devices()