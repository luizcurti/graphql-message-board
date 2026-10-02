import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import RepoService from './repo.service';
import User from './db/models/user.entity';
import Message from './db/models/message.entity';
import UserService from './services/user.service';
import MessageService from './services/message.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([User, Message])],
  providers: [RepoService, UserService, MessageService],
  exports: [RepoService, UserService, MessageService],
})
class RepoModule {}
export default RepoModule;
