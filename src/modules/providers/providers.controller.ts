import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ProvidersService } from './providers.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { ProviderResponseDto } from './dto/provider-response.dto';
import { ProviderHealthDto } from './dto/provider-health.dto';

@ApiTags('AI Providers')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('api/providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Get()
  @ApiOperation({
    summary: 'List available AI providers',
    description:
      'Retrieves all configured AI providers with model listings. API keys are strictly redacted.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of configured AI providers',
    type: [ProviderResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async list(): Promise<ProviderResponseDto[]> {
    return this.providersService.listProviders();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get AI provider details by ID',
    description:
      'Retrieves specific AI provider configuration (keys sanitized)',
  })
  @ApiParam({ name: 'id', description: 'Provider UUID' })
  @ApiResponse({
    status: 200,
    description: 'AI provider details',
    type: ProviderResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async getById(@Param('id') id: string): Promise<ProviderResponseDto> {
    return this.providersService.getProviderById(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @ApiOperation({
    summary: 'Create new AI provider (Admin only)',
    description:
      'Registers a new AI provider. Any API key provided will be encrypted using AES-256 before storage.',
  })
  @ApiResponse({
    status: 201,
    description: 'AI provider created successfully',
    type: ProviderResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires ADMIN role' })
  @ApiResponse({
    status: 409,
    description: 'Provider with this name already exists',
  })
  async create(@Body() dto: CreateProviderDto): Promise<ProviderResponseDto> {
    return this.providersService.createProvider(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @ApiOperation({
    summary: 'Update AI provider configuration (Admin only)',
    description: 'Updates provider settings or rotates the encrypted API key.',
  })
  @ApiParam({ name: 'id', description: 'Provider UUID' })
  @ApiResponse({
    status: 200,
    description: 'AI provider updated successfully',
    type: ProviderResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires ADMIN role' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProviderDto,
  ): Promise<ProviderResponseDto> {
    return this.providersService.updateProvider(id, dto);
  }

  @Post(':id/set-default')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @ApiOperation({
    summary: 'Set default AI provider (Admin only)',
    description:
      'Sets the specified provider as global system default and unsets all others.',
  })
  @ApiParam({ name: 'id', description: 'Provider UUID' })
  @ApiResponse({
    status: 200,
    description: 'Default AI provider updated',
    type: ProviderResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires ADMIN role' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async setDefault(@Param('id') id: string): Promise<ProviderResponseDto> {
    return this.providersService.setDefaultProvider(id);
  }

  @Get(':id/health')
  @ApiOperation({
    summary: 'Check AI provider health status',
    description: 'Verifies provider credentials and connectivity status.',
  })
  @ApiParam({ name: 'id', description: 'Provider UUID' })
  @ApiResponse({
    status: 200,
    description: 'Provider health and operational status',
    type: ProviderHealthDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async checkHealth(@Param('id') id: string): Promise<ProviderHealthDto> {
    return this.providersService.checkProviderHealth(id);
  }
}
