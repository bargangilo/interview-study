const mod = require("../../workspace/meeting-room-finder/main");

describe("findRooms", () => {
  test("assigns smallest room that fits", () => {
    const rooms = [
      { id: "A", capacity: 5 },
      { id: "B", capacity: 10 },
      { id: "C", capacity: 20 }
    ];
    const bookings = [];
    const requests = [{ start: 9, end: 10, minCapacity: 8 }];
    expect(mod.findRooms(rooms, bookings, requests)).toEqual(["B"]);
  });

  test("returns null when no room has enough capacity", () => {
    const rooms = [
      { id: "A", capacity: 5 },
      { id: "B", capacity: 10 }
    ];
    const bookings = [];
    const requests = [{ start: 9, end: 10, minCapacity: 15 }];
    expect(mod.findRooms(rooms, bookings, requests)).toEqual([null]);
  });

  test("skips booked rooms during requested time", () => {
    const rooms = [
      { id: "A", capacity: 10 },
      { id: "B", capacity: 15 },
      { id: "C", capacity: 20 }
    ];
    const bookings = [{ roomId: "A", start: 9, end: 11 }];
    const requests = [{ start: 9, end: 10, minCapacity: 8 }];
    expect(mod.findRooms(rooms, bookings, requests)).toEqual(["B"]);
  });

  test("room available outside booking window", () => {
    const rooms = [
      { id: "A", capacity: 10 },
      { id: "B", capacity: 20 }
    ];
    const bookings = [{ roomId: "A", start: 14, end: 16 }];
    const requests = [{ start: 9, end: 11, minCapacity: 5 }];
    expect(mod.findRooms(rooms, bookings, requests)).toEqual(["A"]);
  });

  test("empty bookings assigns first fitting room", () => {
    const rooms = [
      { id: "X", capacity: 3 },
      { id: "Y", capacity: 7 },
      { id: "Z", capacity: 12 }
    ];
    const bookings = [];
    const requests = [
      { start: 10, end: 11, minCapacity: 1 },
      { start: 12, end: 13, minCapacity: 10 }
    ];
    expect(mod.findRooms(rooms, bookings, requests)).toEqual(["X", "Z"]);
  });

  test("handles many rooms and requests", () => {
    const rooms = [];
    for (let i = 1; i <= 1000; i++) {
      rooms.push({ id: "R" + i, capacity: i });
    }
    const bookings = [];
    for (let i = 1; i <= 500; i++) {
      bookings.push({ roomId: "R" + i, start: 0, end: 24 });
    }
    const requests = [];
    for (let i = 0; i < 1000; i++) {
      requests.push({ start: 0, end: 1, minCapacity: 1 });
    }
    const result = mod.findRooms(rooms, bookings, requests);
    expect(result).toHaveLength(1000);
    expect(result[0]).toBe("R501");
  });

  test("output array length matches requests array length with mixed results", () => {
    const rooms = [
      { id: "A", capacity: 5 },
      { id: "B", capacity: 10 }
    ];
    const bookings = [{ roomId: "B", start: 9, end: 11 }];
    const requests = [
      { start: 9, end: 10, minCapacity: 3 },
      { start: 9, end: 10, minCapacity: 8 },
      { start: 12, end: 13, minCapacity: 6 }
    ];
    const result = mod.findRooms(rooms, bookings, requests);
    expect(result).toHaveLength(3);
    expect(result).toEqual(["A", null, "B"]);
  });

  test("room with multiple bookings is skipped when any booking conflicts", () => {
    const rooms = [
      { id: "A", capacity: 10 },
      { id: "B", capacity: 15 }
    ];
    const bookings = [
      { roomId: "A", start: 9, end: 11 },
      { roomId: "A", start: 13, end: 15 }
    ];
    const requests = [{ start: 14, end: 15, minCapacity: 5 }];
    expect(mod.findRooms(rooms, bookings, requests)).toEqual(["B"]);
  });

  test("request that fully envelops a booking conflicts", () => {
    const rooms = [
      { id: "A", capacity: 10 },
      { id: "B", capacity: 15 }
    ];
    const bookings = [{ roomId: "A", start: 10, end: 11 }];
    const requests = [{ start: 9, end: 12, minCapacity: 5 }];
    expect(mod.findRooms(rooms, bookings, requests)).toEqual(["B"]);
  });

  test("request fully contained within a booking conflicts", () => {
    const rooms = [
      { id: "A", capacity: 10 },
      { id: "B", capacity: 15 }
    ];
    const bookings = [{ roomId: "A", start: 8, end: 17 }];
    const requests = [{ start: 10, end: 12, minCapacity: 5 }];
    expect(mod.findRooms(rooms, bookings, requests)).toEqual(["B"]);
  });

  test("partial overlap from the left conflicts", () => {
    const rooms = [
      { id: "A", capacity: 10 },
      { id: "B", capacity: 15 }
    ];
    const bookings = [{ roomId: "A", start: 10, end: 14 }];
    const requests = [{ start: 8, end: 12, minCapacity: 5 }];
    expect(mod.findRooms(rooms, bookings, requests)).toEqual(["B"]);
  });

  test("partial overlap from the right conflicts", () => {
    const rooms = [
      { id: "A", capacity: 10 },
      { id: "B", capacity: 15 }
    ];
    const bookings = [{ roomId: "A", start: 8, end: 12 }];
    const requests = [{ start: 10, end: 14, minCapacity: 5 }];
    expect(mod.findRooms(rooms, bookings, requests)).toEqual(["B"]);
  });

  test("adjacent intervals do not conflict", () => {
    const rooms = [{ id: "A", capacity: 10 }];
    const bookings = [{ roomId: "A", start: 9, end: 11 }];
    const requests = [{ start: 11, end: 13, minCapacity: 5 }];
    expect(mod.findRooms(rooms, bookings, requests)).toEqual(["A"]);
  });

  test("room at exact capacity threshold is selected", () => {
    const rooms = [
      { id: "A", capacity: 10 },
      { id: "B", capacity: 20 }
    ];
    const bookings = [];
    const requests = [{ start: 9, end: 10, minCapacity: 10 }];
    expect(mod.findRooms(rooms, bookings, requests)).toEqual(["A"]);
  });

  test("single request with no rooms returns null", () => {
    const rooms = [];
    const bookings = [];
    const requests = [{ start: 9, end: 10, minCapacity: 1 }];
    expect(mod.findRooms(rooms, bookings, requests)).toEqual([null]);
  });

  test("unsorted rooms still assigns smallest fitting room", () => {
    const rooms = [
      { id: "C", capacity: 20 },
      { id: "A", capacity: 5 },
      { id: "B", capacity: 10 }
    ];
    const bookings = [];
    const requests = [{ start: 9, end: 10, minCapacity: 8 }];
    expect(mod.findRooms(rooms, bookings, requests)).toEqual(["B"]);
  });

  test("does not mutate the input arrays", () => {
    const rooms = [{ id: "A", capacity: 10 }, { id: "B", capacity: 20 }];
    const bookings = [{ roomId: "A", start: 9, end: 11 }];
    const requests = [{ start: 9, end: 10, minCapacity: 5 }];
    const roomsSnapshot = JSON.parse(JSON.stringify(rooms));
    const bookingsSnapshot = JSON.parse(JSON.stringify(bookings));
    const requestsSnapshot = JSON.parse(JSON.stringify(requests));
    mod.findRooms(rooms, bookings, requests);
    expect(rooms).toEqual(roomsSnapshot);
    expect(bookings).toEqual(bookingsSnapshot);
    expect(requests).toEqual(requestsSnapshot);
  });
});
