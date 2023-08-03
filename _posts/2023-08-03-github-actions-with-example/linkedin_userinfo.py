import os
import requests 
import json

url = "https://api.linkedin.com/v2/userinfo"
token = os.getenv("LINKEDIN_ACCESS_TOKEN")

headers = {"Authorization": f"Bearer {token}"}

response = requests.get(url, headers=headers)
response.raise_for_status()
content = response.json()
print(json.dumps(content, indent=4))