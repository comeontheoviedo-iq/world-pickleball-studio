import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { HOST_SLOT, MAX_GUESTS, nextGuestSlot } from "./src/lib/layouts";
import { defaultChrome, mergeChrome } from "./src/lib/studio-chrome";

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
  to?: string;
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

const roomChrome = new Map<string, ReturnType<typeof defaultChrome>>();

type IoServer = SocketIOServer;

function usedSlots(io: IoServer, sessionId: string): number[] {
  const room = io.sockets.adapter.rooms.get(sessionId);
  const slots: number[] = [];
  if (!room) return slots;
  for (const id of room) {
    const peer = io.sockets.sockets.get(id);
    if (typeof peer?.data?.slot === "number") slots.push(peer.data.slot);
  }
  return slots;
}

function roster(io: IoServer, sessionId: string) {
  const room = io.sockets.adapter.rooms.get(sessionId);
  const peers: { id: string; role: Role; name: string; slot: number }[] = [];
  if (!room) return peers;
  for (const id of room) {
    const peer = io.sockets.sockets.get(id);
    if (peer?.data?.role) {
      peers.push({
        id,
        role: peer.data.role,
        name: peer.data.name,
        slot: typeof peer.data.slot === "number" ? peer.data.slot : HOST_SLOT,
      });
    }
  }
  return peers.sort((a, b) => a.slot - b.slot);
}

function emitRoster(io: IoServer, sessionId: string) {
  io.to(sessionId).emit("roster", { peers: roster(io, sessionId) });
}

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

      const taken = usedSlots(io, sessionId);
      let slot: number | null = null;
      if (role === "host" && !taken.includes(HOST_SLOT)) {
        slot = HOST_SLOT;
      } else {
        slot = nextGuestSlot(taken);
      }
      if (slot === null) {
        socket.emit("room-full", { max: 1 + MAX_GUESTS });
        return;
      }

      void socket.join(sessionId);
      socket.data = { sessionId, role, name: name || role, slot };

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
              slot: peer.data.slot,
            });
          }
        }
      }

      socket.to(sessionId).emit("peer-joined", {
        role,
        name: socket.data.name,
        id: socket.id,
        slot,
      });

      const chrome = roomChrome.get(sessionId);
      if (chrome) socket.emit("chrome", chrome);
      emitRoster(io, sessionId);
    });

    socket.on("signal", ({ sessionId, to, data }: SignalPayload) => {
      if (!sessionId) return;
      if (to) {
        io.to(to).emit("signal", { from: socket.id, data });
        return;
      }
      socket.to(sessionId).emit("signal", { from: socket.id, data });
    });

    socket.on("chrome", ({ sessionId, patch }: ChromePayload) => {
      if (!sessionId || !patch || typeof patch !== "object") return;
      const prev = roomChrome.get(sessionId) ?? defaultChrome();
      const next = mergeChrome(prev, patch);
      roomChrome.set(sessionId, next);
      io.to(sessionId).emit("chrome", next);
    });

    socket.on("vb", ({ sessionId, state }: { sessionId?: string; state?: unknown }) => {
      if (!sessionId || !state || typeof state !== "object") return;
      socket.to(sessionId).emit("vb", {
        from: socket.id,
        slot: socket.data?.slot,
        state,
      });
    });

    socket.on("vb-apply-all", ({ sessionId, mode, setId }: { sessionId?: string; mode?: unknown; setId?: unknown }) => {
      if (!sessionId) return;
      socket.to(sessionId).emit("vb-apply-all", { from: socket.id, mode, setId });
    });

    socket.on("media", ({ sessionId, state }: MediaPayload) => {
      if (!sessionId || !state || typeof state !== "object") return;
      socket.to(sessionId).emit("media", { from: socket.id, state });
    });

    socket.on("disconnect", () => {
      const { sessionId, role, name, slot } = socket.data || {};
      if (sessionId) {
        socket.to(sessionId).emit("peer-left", {
          role,
          name,
          id: socket.id,
          slot,
        });
        emitRoster(io, sessionId);
      }
    });
  });

  server.listen(port, hostname, () => {
    console.log(`World Pickleball Studio → http://localhost:${port}`);
  });
});
