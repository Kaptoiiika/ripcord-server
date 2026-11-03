import { Injectable, NotFoundException } from '@nestjs/common'
import {
  decryptRoomToken,
  encryptRoomToken,
  hashPassword,
  verifyPassword,
} from './room.crypto'
import {
  IPublicRoom,
  IRoom,
  IRoomId,
  IRoomName,
  IUser,
  IUserId,
  JoinRoomCredentials,
  JoinRoomResult,
} from './room.types'

const defaultRooms = ['kaptoiiika', 'qwerty']
const PROTECTED_ROOM_TTL_MS = 5 * 60 * 1000

const normalizePassword = (password?: string) =>
  typeof password === 'string' && password.length > 0 ? password : undefined

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

  createRoom(roomName: IRoomName, userList: IUser[] = [], password?: string) {
    const normalizedPassword = normalizePassword(password)
    const newRoom: IRoom = {
      name: roomName,
      id: roomName,
      userList: userList,
      passwordHash: normalizedPassword
        ? hashPassword(normalizedPassword)
        : undefined,
    }

    this.roomList.set(roomName, newRoom)
    return newRoom
  }

  deleteRoom(roomId: IRoomId) {
    const room = this.roomList.get(roomId)
    if (room?.removeTimer) clearTimeout(room.removeTimer)
    this.roomList.delete(roomId)
  }

  getRoomList(): IRoom[] {
    const arr: IRoom[] = Array.from(this.roomList.values())
    return arr
  }

  toPublicRoom(room: IRoom): IPublicRoom {
    return {
      id: room.id,
      name: room.name,
      userList: room.userList,
      hasPassword: Boolean(room.passwordHash),
    }
  }

  removeUserFromRoom(roomId: IRoomId, userId: IUserId): IRoom | false {
    const room = this.getRoom(roomId)
    const newUserList = room.userList.filter((user) => user.id !== userId)
    if (newUserList.length === 0 && !defaultRooms.includes(roomId)) {
      if (room.passwordHash) {
        room.userList = newUserList
        this.scheduleProtectedRoomRemoval(room)
        return room
      }
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

    this.clearRemoveTimer(room)

    // if (room.userList.length >= 4) {
    //   throw new Error()
    // }

    if (room.userList.find((curuser) => curuser.id === user.id)) {
      return room
    }
    room.userList.push(user)
    return room
  }

  joinRoom(
    roomId: IRoomId,
    user: IUser,
    credentials: JoinRoomCredentials = {},
  ): JoinRoomResult {
    const password = normalizePassword(credentials.password)
    const token = normalizePassword(credentials.token)
    const room = this.roomList.get(roomId)

    if (!room) {
      const passwordFromToken = token
        ? decryptRoomToken(token, roomId)
        : undefined
      const roomPassword = password ?? passwordFromToken
      const newRoom = this.createRoom(roomId, [user], roomPassword)

      return {
        isJoined: true,
        room: newRoom,
        token: roomPassword
          ? encryptRoomToken(roomId, roomPassword)
          : undefined,
      }
    }

    if (!room.passwordHash) {
      return { isJoined: true, room: this.addUserToRoom(roomId, user) }
    }

    const isPasswordValid = password
      ? verifyPassword(password, room.passwordHash)
      : false
    const passwordFromToken =
      !isPasswordValid && token ? decryptRoomToken(token, roomId) : undefined
    const isTokenValid = passwordFromToken
      ? verifyPassword(passwordFromToken, room.passwordHash)
      : false

    if (!isPasswordValid && !isTokenValid) {
      return { isJoined: false, isWrongPassword: Boolean(password || token) }
    }

    const acceptedPassword = isPasswordValid ? password : passwordFromToken

    if (!acceptedPassword) {
      return { isJoined: false, isWrongPassword: Boolean(password || token) }
    }

    return {
      isJoined: true,
      room: this.addUserToRoom(roomId, user),
      token: encryptRoomToken(roomId, acceptedPassword),
    }
  }

  private clearRemoveTimer(room: IRoom) {
    if (!room.removeTimer) return
    clearTimeout(room.removeTimer)
    room.removeTimer = undefined
  }

  private scheduleProtectedRoomRemoval(room: IRoom) {
    this.clearRemoveTimer(room)
    room.removeTimer = setTimeout(() => {
      const currentRoom = this.roomList.get(room.id)
      if (!currentRoom || currentRoom.userList.length > 0) return
      this.deleteRoom(room.id)
    }, PROTECTED_ROOM_TTL_MS)
  }
}
