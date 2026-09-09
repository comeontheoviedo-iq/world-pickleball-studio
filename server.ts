import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";
import { Server as SocketIOServer } from "socket.io";

const port = parseInt(process.env.PORT || "3010", 10);
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

type ChromePayload = {
  sessionId: string;
  patch?: Record<string, unknown>;
};

type MediaPayload = {
  sessionId: string;
  state?: { muted?: boolean; cameraOn?: boolean };
};

const roomChrome = new Map<string, Record<string, unknown>>();

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

      const chrome = roomChrome.get(sessionId);
      if (chrome) socket.emit("chrome", chrome);
    });

    socket.on("signal", ({ sessionId, data }: SignalPayload) => {
      if (!sessionId) return;
      socket.to(sessionId).emit("signal", { from: socket.id, data });
    });

    socket.on("chrome", ({ sessionId, patch }: ChromePayload) => {
      if (!sessionId || !patch || typeof patch !== "object") return;
      const prev = roomChrome.get(sessionId) ?? {};
      const next = { ...prev, ...patch };
      roomChrome.set(sessionId, next);
      io.to(sessionId).emit("chrome", next);
    });

    socket.on("media", ({ sessionId, state }: MediaPayload) => {
      if (!sessionId || !state || typeof state !== "object") return;
      socket.to(sessionId).emit("media", { from: socket.id, state });
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
