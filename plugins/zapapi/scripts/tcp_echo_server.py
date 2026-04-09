import argparse
import socket
import threading


def handle_client(conn: socket.socket, addr: tuple[str, int]) -> None:
    print(f"[+] Client connected: {addr[0]}:{addr[1]}")
    try:
        while True:
            data = conn.recv(4096)
            if not data:
                break
            text = data.decode("utf-8", errors="replace")
            print(f"[>] {addr[0]}:{addr[1]} -> {text!r}")
            conn.sendall(data)
    except ConnectionResetError:
        pass
    finally:
        conn.close()
        print(f"[-] Client disconnected: {addr[0]}:{addr[1]}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Simple TCP Echo Server")
    parser.add_argument("--host", default="127.0.0.1", help="Host to bind")
    parser.add_argument("--port", type=int, default=9001, help="Port to bind")
    args = parser.parse_args()

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server:
        server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server.bind((args.host, args.port))
        server.listen(128)
        print(f"[*] Echo server listening on {args.host}:{args.port}")

        while True:
            conn, addr = server.accept()
            thread = threading.Thread(
                target=handle_client, args=(conn, addr), daemon=True
            )
            thread.start()


if __name__ == "__main__":
    main()
