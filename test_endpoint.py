import requests
import json

# Test the feature engineering suggestions endpoint
url = "http://localhost:8000/api/datasets/feature-engineering-suggestions/"
headers = {
    "Content-Type": "application/json",
}

# This will fail with 401 (unauthorized) but we're just checking if the endpoint responds
data = {"fileId": "test"}

try:
    response = requests.post(url, json=data, headers=headers, timeout=5)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text[:500]}")
    
    if response.status_code == 500:
        print("\n❌ ERROR: 500 Internal Server Error - Backend has an issue")
    elif response.status_code == 401:
        print("\n✅ SUCCESS: Endpoint is working (401 is expected without auth token)")
    elif response.status_code == 400:
        print("\n✅ SUCCESS: Endpoint is working (400 is expected with invalid fileId)")
    elif response.status_code == 404:
        print("\n✅ SUCCESS: Endpoint is working (404 is expected with non-existent fileId)")
    else:
        print(f"\n✅ SUCCESS: Endpoint responded with status {response.status_code}")
        
except requests.exceptions.ConnectionError:
    print("❌ ERROR: Cannot connect to backend. Is the server running?")
except Exception as e:
    print(f"❌ ERROR: {str(e)}")
