import os
from urllib.parse import urlencode, urlparse
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import requests
import webbrowser

client_id = os.getenv("CLIENT_ID")
client_secret = os.getenv("CLIENT_SECRET")
redirect_uri = os.getenv("REDIRECT_URI")
scope = "r_liteprofile w_member_social openid profile email"

def parse_query(path):
    parsed_url = urlparse(path)
    query = parsed_url.query.split("&")
    query = [x.split("=") for x in query]
    query = {x[0]: x[1] for x in query}
    return query

def auth_code(code, client_id, client_secret, redirect_uri):
    params = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri,
        "client_id": client_id,
        "client_secret": client_secret
    }
    headers = {
        "content-type": "application/x-www-form-urlencoded",
        "content-length": "0"
    }
    url = "https://www.linkedin.com/oauth/v2/accessToken"
    response = requests.post(url, params=params, headers=headers)
    response.raise_for_status()
    content = response.json()
    return content

class NeuralHTTP(BaseHTTPRequestHandler):
    def do_GET(self):
        path = self.path
        query = parse_query(path)

        code = query.get("code")
        if code:
            status_code = 200
            content = auth_code(
                code=query.get("code"),
                client_id=client_id,
                client_secret=client_secret,
                redirect_uri=redirect_uri
            )
            print(json.dumps(content, indent=4))
        else:
            status_code = 400
            content = {
                "error": "code not found"
            }

        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(bytes(json.dumps(content, indent=4), "utf-8"))
    
    def log_message(self, format, *args):
        """Silence log message. Can be ignored."""
        return

if __name__ == "__main__":
    with HTTPServer(("127.0.0.1", 8088), NeuralHTTP) as server:
        auth_url = "https://www.linkedin.com/oauth/v2/authorization"
        params = {
            "client_id": client_id,
            "response_type": "code",
            "redirect_uri": redirect_uri,
            "scope": scope,
        }

        url = f"{auth_url}?{urlencode(params)}"
        webbrowser.open(url)
        server.handle_request()
