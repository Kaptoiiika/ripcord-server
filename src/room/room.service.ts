import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { IRoom, IRoomId, IRoomName, IUser, IUserId } from './room.types'

const defaultRooms = ['kaptoiiika', 'qwerty']

@Injectable()
export class RoomService {
  private roomList = new Map<IRoomId, IRoom>()

  constructor() {
    defaultRooms.forEach((roomName) => {
      this.roomList.set(roomName, {
        id: roomName,
        name: roomName,
        userList: [],
      })
    })
  }

  getRoom(IRoomId: IRoomId) {
    const room = this.roomList.get(IRoomId)
    if (!room) throw new NotFoundException()
    return room
  }

  createRoom(roomName: IRoomName, userList: IUser[] = []) {
    const newRoom: IRoom = {
      name: roomName,
      id: roomName,
      userList: userList,
    }

    this.roomList.set(roomName, newRoom)
    return newRoom
  }

  deleteRoom(roomId: IRoomId) {
    this.roomList.delete(roomId)
  }

  getRoomList(): IRoom[] {
    const arr: IRoom[] = Array.from(this.roomList.values())
    return arr
  }

  removeUserFromRoom(roomId: IRoomId, userId: IUserId): IRoom | false {
    const room = this.getRoom(roomId)
    const newUserList = room.userList.filter((user) => user.id !== userId)
    if (newUserList.length === 0 && !defaultRooms.includes(roomId)) {
      this.deleteRoom(roomId)
      return false
    }
    room.userList = newUserList
    return room
  }

  addUserToRoom(roomId: IRoomId, user: IUser): IRoom {
    const room = this.roomList.get(roomId)

    if (!room) {
      const newRoom = this.createRoom(roomId, [user])
      return newRoom
    }

    if (room.userList.length >= 4) {
      throw new Error()
    }

    if (room.userList.find((curuser) => curuser.id === user.id)) {
      return room
    }
    room.userList.push(user)
    return room
  }
}
