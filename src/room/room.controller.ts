import { Controller, Get, Param } from '@nestjs/common'
import { RoomService } from './room.service'

@Controller('room')
export class RoomController {
  constructor(private roomService: RoomService) {}

  @Get('/')
  getRoomList() {
    return this.roomService.getRoomList()
  }

  @Get(':id')
  getRoom(@Param('id') id: string) {
    return this.roomService.getRoom(id)
  }
}
