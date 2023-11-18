import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import { Socket, Server } from 'socket.io'
import { RoomService } from 'src/room/room.service'
import { IUser } from 'src/room/room.types'

type joinRoom = { name: string; username: string, reconnect?:boolean }
type ClientId = { id: string }
type Answer = { answer: string }
type Offer = { offer: string }
type Ice = { ice: string }

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class WebrtcGateway {
  @WebSocketServer() server: Server
  constructor(private roomService: RoomService) {}

  @SubscribeMessage('join')
  joinRoom(client: Socket, payload: joinRoom) {
    if (!payload?.name) {
      return
    }
    const user: IUser = {
      id: client.id,
      username: payload.username || client.id,
    }
    try {
      const room = this.roomService.addUserToRoom(payload.name, user)
      this.server.to(payload.name).emit('user_join', {...user, reconnect: payload.reconnect})
      const usersWithOutCurrentClient = room.userList.filter(
        (curuser) => curuser.id !== user.id,
      ).map(u=>({...u, reconnect: payload.reconnect}))
      client.join(payload.name)
      client.emit('users_in_room', usersWithOutCurrentClient)
      client.on('disconnecting', () => {
        const rooms = Array.from(client.rooms.values()).filter(
          (room) => room !== client.id,
        )
        rooms.forEach((roomId) => {
          client.leave(roomId)
          this.roomService.removeUserFromRoom(roomId, client.id)
        })
      })
    } catch (error) {
      client.emit('room_is_full')
    }
  }

  @SubscribeMessage('leave')
  leaveRoom(client: Socket) {
    const rooms = Array.from(client.rooms.values()).filter(
      (room) => room !== client.id,
    )
    rooms.forEach((roomId) => {
      client.leave(roomId)
      this.roomService.removeUserFromRoom(roomId, client.id)
      this.server.to(roomId).emit('user_leave', { id: client.id })
    })
  }
  
  @SubscribeMessage('new_answer')
  sendAnswer(client: Socket, data: ClientId & Answer) {
    const { id, answer } = data
    const resp = { id: client.id, answer: answer }
    this.server.to(id).emit('new_answer', resp)
  }
  @SubscribeMessage('new_offer')
  sendOffer(client: Socket, data: ClientId & Offer) {
    const { id, offer } = data
    const resp = { id: client.id, offer: offer }
    this.server.to(id).emit('new_offer', resp)
  }
  @SubscribeMessage('new_ice')
  sendIce(client: Socket, data: ClientId & Ice) {
    const { id, ice } = data
    const resp = { id: client.id, ice: ice }
    this.server.to(id).emit('new_ice', resp)
  }
  @SubscribeMessage('request_new_offer')
  requestNewOffer(client: Socket, data: ClientId) {
    const { id } = data
    const resp = { id: client.id }
    this.server.to(id).emit('request_new_offer', resp)
  }
}
