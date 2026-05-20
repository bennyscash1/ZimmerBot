import roomRepository from '../5-repositories/roomRepository.js';

// DEV MODE: all role/ownership filters removed.
export class RoomService {
  async getAllRooms(_user) {
    const rooms = await roomRepository.findAll({});
    return rooms.map(r => r.toJSON());
  }

  async getRoomById(id, _user) {
    const room = await roomRepository.findById(id);
    if (!room) {
      throw new Error('Room not found');
    }
    return room.toJSON();
  }

  async createRoom(roomData, user) {
    const data = { ...roomData };
    data.userId = user._id;

    if (roomData.lodging_id && !roomData.unitId) {
      data.unitId = roomData.lodging_id;
    } else if (!data.unitId) {
      throw new Error('unitId is required');
    }
    delete data.lodging_id;

    const room = await roomRepository.create(data);
    return room.toJSON();
  }

  async updateRoom(id, roomData, _user) {
    const room = await roomRepository.findById(id);
    if (!room) {
      throw new Error('Room not found');
    }
    const data = { ...roomData };
    if (data.lodging_id && !data.unitId) {
      data.unitId = data.lodging_id;
      delete data.lodging_id;
    }
    const updatedRoom = await roomRepository.update(id, data);
    return updatedRoom.toJSON();
  }

  async deleteRoom(id, _user) {
    const room = await roomRepository.findById(id);
    if (!room) {
      throw new Error('Room not found');
    }
    await roomRepository.delete(id);
    return { message: 'Room deleted successfully' };
  }

  async getRoomsByUnitId(unitId, _user) {
    const rooms = await roomRepository.findByUnitId(unitId);
    return rooms.map(r => r.toJSON());
  }
}

export default new RoomService();
