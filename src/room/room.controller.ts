import { Controller, Get, Param } from '@nestjs/common'
import { RoomService } from './room.service'

@Controller('room')
export class RoomController {
  constructor(private roomService: RoomService) {}

  @Get('/')
  getRoomList() {
    return this.roomService
      .getRoomList()
      .map((room) => this.roomService.toPublicRoom(room))
  }

  @Get(':id')
  getRoom(@Param('id') id: string) {
    return this.roomService.toPublicRoom(this.roomService.getRoom(id))
  }
}
