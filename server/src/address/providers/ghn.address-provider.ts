import type {
  District,
  IAddressProvider,
  Province,
  Ward,
} from '../interfaces/address-provider.interface.js';

import { InternalServerErrorException } from '@nestjs/common';

export abstract class GhnAddressProvider implements IAddressProvider {
  protected abstract readonly apiUrl: string;
  protected readonly token = process.env.GHN_TOKEN as string;

  protected get headers() {
    return {
      'Content-Type': 'application/json',
      Token: this.token,
    };
  }

  async getProvinces(): Promise<Province[]> {
    const res = await fetch(`${this.apiUrl}/province`, {
      method: 'GET',
      headers: this.headers,
    });

    const data = (await res.json()) as {
      code: number;
      message: string;
      data?: { ProvinceID: number; ProvinceName: string }[];
    };

    if (data.code !== 200 || !data.data) {
      throw new InternalServerErrorException(`GHN error: ${data.message}`);
    }

    return data.data.map((p) => ({ id: p.ProvinceID, name: p.ProvinceName }));
  }

  async getDistricts(provinceId: number): Promise<District[]> {
    const res = await fetch(`${this.apiUrl}/district`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ province_id: provinceId }),
    });

    const data = (await res.json()) as {
      code: number;
      message: string;
      data?: { DistrictID: number; DistrictName: string; ProvinceID: number }[];
    };

    if (data.code !== 200 || !data.data) {
      throw new InternalServerErrorException(`GHN error: ${data.message}`);
    }

    return data.data.map((d) => ({
      id: d.DistrictID,
      name: d.DistrictName,
      provinceId: d.ProvinceID,
    }));
  }

  async getWards(districtId: number): Promise<Ward[]> {
    const res = await fetch(`${this.apiUrl}/ward`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ district_id: districtId }),
    });

    const data = (await res.json()) as {
      code: number;
      message: string;
      data?: { WardCode: string; WardName: string; DistrictID: number }[];
    };

    if (data.code !== 200 || !data.data) {
      throw new InternalServerErrorException(`GHN error: ${data.message}`);
    }

    return data.data.map((w) => ({
      code: w.WardCode,
      name: w.WardName,
      districtId: w.DistrictID,
    }));
  }
}
