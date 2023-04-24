import { Module } from '@nestjs/common'
import { RoomModule } from 'src/room/room.module'
import { WebrtcGateway } from './webrtc.gateway'

@Module({
  providers: [WebrtcGateway],
  imports: [RoomModule],
})
export class WebrtcModule {}
