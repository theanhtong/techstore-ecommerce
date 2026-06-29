export interface Province {
  id: number;
  name: string;
}

export interface District {
  id: number;
  name: string;
  provinceId: number;
}

export interface Ward {
  code: string;
  name: string;
  districtId: number;
}

export interface IAddressProvider {
  getProvinces(): Promise<Province[]>;
  getDistricts(provinceId: number): Promise<District[]>;
  getWards(districtId: number): Promise<Ward[]>;
}

export const ADDRESS_PROVIDER = 'ADDRESS_PROVIDER';
