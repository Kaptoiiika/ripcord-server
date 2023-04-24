import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WebrtcModule } from './webrtc/webrtc.module';
import { RoomModule } from './room/room.module';

@Module({
  imports: [WebrtcModule, RoomModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
