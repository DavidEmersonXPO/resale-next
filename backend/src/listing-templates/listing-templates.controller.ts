import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ListingTemplatesService } from './listing-templates.service';
import { CreateListingTemplateDto } from './dto/create-template.dto';

@ApiTags('Listing Templates')
@Controller('listing-templates')
export class ListingTemplatesController {
  constructor(private readonly templatesService: ListingTemplatesService) {}

  @Get()
  findAll() {
    return this.templatesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.templatesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateListingTemplateDto) {
    return this.templatesService.create(dto);
  }
}
