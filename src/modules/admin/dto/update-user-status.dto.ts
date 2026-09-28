import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateUserStatusDto {
  @ApiProperty({
    example: false,
    description:
      'Whether the user account is active. If false, active sessions are immediately revoked.',
  })
  @IsBoolean()
  isActive: boolean;
}

export class AdminUserStatusResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: false })
  isActive: boolean;

  @ApiProperty({
    example: 'User account has been deactivated and active sessions revoked',
  })
  message: string;
}
