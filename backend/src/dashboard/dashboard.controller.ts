import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiSession } from '../auth/decorators/api-session.decorator';
import { DashboardService } from './dashboard.service';
import { DashboardDto } from './dto/dashboard-response.dto';

/** The staff home page, in one request. Any staff member. See docs/dashboard.md. */
@ApiTags('dashboard')
@ApiSession()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @ApiOperation({ summary: 'The numbers on the staff home page' })
  @ApiOkResponse({ type: DashboardDto })
  @Get()
  read(): Promise<DashboardDto> {
    return this.dashboard.read();
  }
}
