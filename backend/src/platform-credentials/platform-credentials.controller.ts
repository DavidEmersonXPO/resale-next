import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PlatformCredentialsService } from './platform-credentials.service';
import { CreatePlatformCredentialDto } from './dto/create-platform-credential.dto';
import { UpdatePlatformCredentialDto } from './dto/update-platform-credential.dto';

@ApiTags('Platform Credentials')
@Controller('platform-credentials')
export class PlatformCredentialsController {
  constructor(
    private readonly platformCredentialsService: PlatformCredentialsService,
  ) {}

  @Post()
  create(@Body() dto: CreatePlatformCredentialDto) {
    return this.platformCredentialsService.create(dto);
  }

  @Get()
  findAll() {
    return this.platformCredentialsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.platformCredentialsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePlatformCredentialDto) {
    return this.platformCredentialsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.platformCredentialsService.remove(id);
  }
}
