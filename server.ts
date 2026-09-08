import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";
import { Server as SocketIOServer } from "socket.io";

const port = parseInt(process.env.PORT || "3000", 10);
const hostname = process.env.HOSTNAME || "0.0.0.0";
const dev = process.env.NODE_ENV !== "production";

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

type Role = "host" | "guest";

type JoinPayload = {
  sessionId: string;
  role: Role;
  name: string;
};

type SignalPayload = {
  sessionId: string;
  data: unknown;
};

type LowerThirdPayload = {
  sessionId: string;
  hostName?: string;
  hostTitle?: string;
  guestName?: string;
  guestTitle?: string;
  kicker?: string;
};

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url || "/", true);
    handle(req, res, parsedUrl).catch((err) => {
      console.error(err);
      res.statusCode = 500;
      res.end("Internal server error");
    });
  });

  const io = new SocketIOServer(server, {
    path: "/signal",
    cors: { origin: true },
  });

  io.on("connection", (socket) => {
    socket.on("join", ({ sessionId, role, name }: JoinPayload) => {
      if (!sessionId || (role !== "host" && role !== "guest")) return;
      void socket.join(sessionId);
      socket.data = { sessionId, role, name: name || role };

      const room = io.sockets.adapter.rooms.get(sessionId);
      if (room) {
        for (const id of room) {
          if (id === socket.id) continue;
          const peer = io.sockets.sockets.get(id);
          if (peer?.data?.role) {
            socket.emit("peer-joined", {
              role: peer.data.role,
              name: peer.data.name,
              id: peer.id,
            });
          }
        }
      }

      socket.to(sessionId).emit("peer-joined", {
        role,
        name: socket.data.name,
        id: socket.id,
      });
    });

    socket.on("signal", ({ sessionId, data }: SignalPayload) => {
      if (!sessionId) return;
      socket.to(sessionId).emit("signal", { from: socket.id, data });
    });

    socket.on("lower-third", (payload: LowerThirdPayload) => {
      if (!payload?.sessionId) return;
      socket.to(payload.sessionId).emit("lower-third", payload);
    });

    socket.on("disconnect", () => {
      const { sessionId, role, name } = socket.data || {};
      if (sessionId) {
        socket.to(sessionId).emit("peer-left", {
          role,
          name,
          id: socket.id,
        });
      }
    });
  });

  server.listen(port, hostname, () => {
    console.log(`World Pickleball Studio → http://localhost:${port}`);
  });
});
