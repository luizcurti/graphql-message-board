import { Injectable } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import RepoService from '../repo.service';
import User from '../db/models/user.entity';
import { paginate, Paginated } from '../common/paginate';

@Injectable()
export default class UserService {
  public constructor(private readonly repoService: RepoService) {}

  public async findAll(page: number, limit: number): Promise<Paginated<User>> {
    const [items, total] = await this.repoService.userRepo.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return paginate(items, total, page, limit);
  }

  public async findOne(id: number): Promise<User | null> {
    return this.repoService.userRepo.findOne({ where: { id } });
  }

  public async createOrLogin(email: string): Promise<User> {
    const normalizedEmail = this.normalizeEmail(email);

    const existingUser = await this.repoService.userRepo.findOne({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return existingUser;
    }

    const user = this.repoService.userRepo.create({ email: normalizedEmail });
    return this.repoService.userRepo.save(user);
  }

  public async update(id: number, email: string): Promise<User> {
    const user = await this.repoService.userRepo.findOne({ where: { id } });

    if (!user) {
      throw new GraphQLError('User not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const normalizedEmail = this.normalizeEmail(email);

    const emailAlreadyInUse = await this.repoService.userRepo.findOne({
      where: { email: normalizedEmail },
    });

    if (emailAlreadyInUse && emailAlreadyInUse.id !== id) {
      throw new GraphQLError('Email is already in use by another account', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    user.email = normalizedEmail;
    return this.repoService.userRepo.save(user);
  }

  public async remove(id: number): Promise<User> {
    const user = await this.repoService.userRepo.findOne({ where: { id } });

    if (!user) {
      throw new GraphQLError('User not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const copy = { ...user };
    await this.repoService.userRepo.remove(user);
    return copy;
  }

  private normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }
}
