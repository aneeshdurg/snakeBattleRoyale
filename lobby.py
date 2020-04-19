import tornado
import json

from tornado import websocket, web, ioloop

class ProbeHandler(web.RequestHandler):
    def check_origin(self, origin):
        return True

    def get(self):
        self.write('Hello')

lobby = {};
class LobbyHandler(websocket.WebSocketHandler):
    def check_origin(self, origin):
        return True

    def open(self):
        pass

    def on_close(self):
        print("Client", self.id, "disconnected")
        del lobby[self.id]

    def on_message(self, message):
        self.id = message
        print("Client", message, "connected")
        lobby[self.id] = self
        # TODO add timers and stuff
        if len(lobby) >= 4:
            clients = list(lobby.keys())[:20]
            for c in clients[1:]:
                lobby[c].write_message(
                    json.dumps({
                        "type": "startClient",
                        "host": clients[0]
                    }))
                lobby[c].close()

            lobby[clients[0]].write_message(json.dumps({
                "type": "startHost",
                "expectedClients": len(clients) - 1
            }))
            lobby[clients[0]].close()

        else:
            for client in lobby:
                lobby[client].write_message(
                    json.dumps({"type": "update", "clients": len(lobby)}))

class web_app(web.Application):
    def __init__(self):
        web.Application.__init__(self, [
            (r'/ws', LobbyHandler),
            (r'/probe', ProbeHandler),
        ])

if __name__ == '__main__':
    app = web_app()
    print("Now running at http://localhost:5000/ws")
    app.listen(5000)
    ioloop.IOLoop.instance().start()
