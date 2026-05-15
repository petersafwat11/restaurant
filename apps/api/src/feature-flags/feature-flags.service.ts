import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  FLAG_CATALOG,
  type FeatureFlagKey,
  type FlagDbRow,
  evaluateAll,
  evaluateFlag,
  isFeatureFlagKey,
  parseEnvOverrides,
} from '@repo/feature-flags';
import type {
  FeatureFlagAdminDto,
  FeatureFlagListDto,
  UpdateFeatureFlagDto,
} from '@repo/types';
import { ENV, type ENV_TYPE } from '../config/config.module';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeatureFlagsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENV) private readonly env: ENV_TYPE,
  ) {}

  private get envOverrides() {
    return parseEnvOverrides(this.env.FEATURE_FLAG_OVERRIDES);
  }

  private async dbRows(): Promise<FlagDbRow[]> {
    const rows = await this.prisma.featureFlag.findMany();
    return rows.map((r) => ({
      key: r.key,
      enabled: r.enabled,
      rolloutPercent: r.rolloutPercent,
    }));
  }

  async resolveAll(
    subjectId?: string | null,
  ): Promise<Record<FeatureFlagKey, boolean>> {
    return evaluateAll(
      { subjectId },
      { envOverrides: this.envOverrides, dbRows: await this.dbRows() },
    );
  }

  async isEnabled(
    key: FeatureFlagKey,
    subjectId?: string | null,
  ): Promise<boolean> {
    return evaluateFlag(
      key,
      { subjectId },
      { envOverrides: this.envOverrides, dbRows: await this.dbRows() },
    );
  }

  async listAdmin(): Promise<FeatureFlagListDto> {
    const rows = await this.prisma.featureFlag.findMany();
    const byKey = new Map(rows.map((r) => [r.key, r]));
    const items: FeatureFlagAdminDto[] = (
      Object.keys(FLAG_CATALOG) as FeatureFlagKey[]
    ).map((key) => {
      const row = byKey.get(key);
      return {
        key,
        description: FLAG_CATALOG[key].description,
        enabled: row ? row.enabled : FLAG_CATALOG[key].default,
        rolloutPercent: row ? row.rolloutPercent : 0,
        default: FLAG_CATALOG[key].default,
      };
    });
    return { items };
  }

  async update(
    key: string,
    dto: UpdateFeatureFlagDto,
  ): Promise<FeatureFlagAdminDto> {
    if (!isFeatureFlagKey(key)) {
      throw new BadRequestException(`Unknown feature flag: ${key}`);
    }
    const row = await this.prisma.featureFlag.upsert({
      where: { key },
      create: {
        key,
        description: FLAG_CATALOG[key].description,
        enabled: dto.enabled ?? FLAG_CATALOG[key].default,
        rolloutPercent: dto.rolloutPercent ?? 0,
      },
      update: {
        ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
        ...(dto.rolloutPercent !== undefined
          ? { rolloutPercent: dto.rolloutPercent }
          : {}),
      },
    });
    return {
      key,
      description: row.description,
      enabled: row.enabled,
      rolloutPercent: row.rolloutPercent,
      default: FLAG_CATALOG[key].default,
    };
  }
}
