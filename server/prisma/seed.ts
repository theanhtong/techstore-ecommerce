import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import { uuidv7 } from 'uuidv7';
import dotenv from 'dotenv';

dotenv.config();

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('=== STARTING DATABASE SEEDING ===');

  try {
    const userCount = await prisma.user.count();
    const productCount = await prisma.product.count();
    if (userCount > 0 && productCount > 0) {
      console.log('=== DATABASE ALREADY SEEDED. SKIPPING ===');
      return;
    }
  } catch (e) {
    console.log('No existing schema or data found. Starting fresh seed...');
  }

  // 1. Clean existing database records
  console.log('Cleaning up existing database records...');
  try {
    const existingTablesResult = await prisma.$queryRawUnsafe<{ table_name: string }[]>(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    const dbTables = existingTablesResult.map(r => r.table_name);
    const tableNames = [
      "users", "addresses", "categories", "brands", "products", "product_variants", 
      "product_images", "inventories", "carts", "cart_items", "orders", "order_items", 
      "payments", "shipments", "shipment_trackings", "reviews", "review_replies", 
      "campaigns", "promotions", "promotion_products", "coupons", "coupon_usages", 
      "wishlists", "notifications", "audit_logs", "sessions", "email_verifications", 
      "phone_verifications"
    ];
    
    const tablesToTruncate = tableNames
      .filter(t => dbTables.includes(t))
      .map(t => `"${t}"`);
      
    if (tablesToTruncate.length > 0) {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tablesToTruncate.join(', ')} CASCADE;`);
      console.log('✓ Cleanup complete.');
    } else {
      console.log('No tables found to clean.');
    }
  } catch (err) {
    console.log('Error during database cleanup:', err);
  }

  // 2. Create Users
  console.log('Creating users...');
  const adminPassword = await bcrypt.hash('admin123', 10);
  const staffPassword = await bcrypt.hash('staff123', 10);
  const customerPassword = await bcrypt.hash('customer123', 10);

  const adminId = uuidv7();
  const staffId = uuidv7();
  const customerId = uuidv7();

  await prisma.user.create({
    data: {
      id: adminId,
      email: 'admin@techstore.com',
      password: adminPassword,
      name: 'System Admin',
      role: 'ADMIN',
      isActive: true,
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.user.create({
    data: {
      id: staffId,
      email: 'staff@techstore.com',
      password: staffPassword,
      name: 'Store Staff',
      role: 'STAFF',
      isActive: true,
      emailVerifiedAt: new Date(),
    },
  });

  const customer = await prisma.user.create({
    data: {
      id: customerId,
      email: 'customer@techstore.com',
      password: customerPassword,
      name: 'John Doe',
      role: 'CUSTOMER',
      isActive: true,
      emailVerifiedAt: new Date(),
    },
  });
  console.log('✓ Users created.');

  // 3. Create Addresses for customer
  console.log('Creating addresses...');
  const address1Id = uuidv7();
  const address2Id = uuidv7();

  await prisma.address.create({
    data: {
      id: address1Id,
      userId: customer.id,
      fullName: 'John Doe',
      phone: '0987654321',
      addressLine: '123 Đường Xuân Thủy',
      provinceId: 201, // Hà Nội
      provinceName: 'Hà Nội',
      districtId: 3440, // Tây Hồ
      districtName: 'Quận Tây Hồ',
      wardCode: '1A0807', // Phú Thượng
      wardName: 'Phường Phú Thượng',
      isDefault: true,
    },
  });

  await prisma.address.create({
    data: {
      id: address2Id,
      userId: customer.id,
      fullName: 'John Doe (Công ty)',
      phone: '0912345678',
      addressLine: 'Toà nhà Bitexco, Lầu 25',
      provinceId: 202, // TP Hồ Chí Minh
      provinceName: 'Hồ Chí Minh',
      districtId: 1454, // Quận 3
      districtName: 'Quận 3',
      wardCode: '20710', // Phường 10
      wardName: 'Phường 10',
      isDefault: false,
    },
  });
  console.log('✓ Addresses created.');

  // 4. Create Categories
  console.log('Creating categories...');
  const catLaptopsId = uuidv7();
  const catPhonesId = uuidv7();
  const catAudioId = uuidv7();
  const catKeyboardsId = uuidv7();
  const catMiceId = uuidv7();

  await prisma.category.create({
    data: { id: catLaptopsId, name: 'Laptops', slug: 'laptops', order: 1, isActive: true },
  });
  await prisma.category.create({
    data: { id: catPhonesId, name: 'Phones', slug: 'phones', order: 2, isActive: true },
  });
  await prisma.category.create({
    data: { id: catAudioId, name: 'Audio', slug: 'audio', order: 3, isActive: true },
  });
  await prisma.category.create({
    data: { id: catKeyboardsId, name: 'Keyboards', slug: 'keyboards', order: 4, isActive: true },
  });
  await prisma.category.create({
    data: { id: catMiceId, name: 'Mice', slug: 'mice', order: 5, isActive: true },
  });
  console.log('✓ Categories created.');

  // 5. Create Brands
  console.log('Creating brands...');
  const brandAppleId = uuidv7();
  const brandAsusId = uuidv7();
  const brandLogitechId = uuidv7();
  const brandSonyId = uuidv7();
  const brandKeychronId = uuidv7();

  await prisma.brand.create({ data: { id: brandAppleId, name: 'Apple', slug: 'apple', isActive: true } });
  await prisma.brand.create({ data: { id: brandAsusId, name: 'ASUS', slug: 'asus', isActive: true } });
  await prisma.brand.create({ data: { id: brandLogitechId, name: 'Logitech', slug: 'logitech', isActive: true } });
  await prisma.brand.create({ data: { id: brandSonyId, name: 'Sony', slug: 'sony', isActive: true } });
  await prisma.brand.create({ data: { id: brandKeychronId, name: 'Keychron', slug: 'keychron', isActive: true } });
  console.log('✓ Brands created.');

  // Helper helper to generate products, variants, images, and inventory
  const createProductWithVariants = async (params: {
    id: string;
    categoryId: string;
    brandId: string;
    name: string;
    slug: string;
    description: string;
    imageUrl: string;
    variants: Array<{
      id: string;
      sku: string;
      price: number;
      weight: number;
      color?: string;
      connectivity?: string;
      cpu?: string;
      ram?: string;
      storage?: string;
      display?: string;
      gpu?: string;
      os?: string;
      battery?: string;
      switchType?: string;
      layout?: string;
      formFactor?: string;
      dpi?: number;
      buttons?: number;
      sensor?: string;
      quantity: number;
    }>;
  }) => {
    // A. Product
    await prisma.product.create({
      data: {
        id: params.id,
        categoryId: params.categoryId,
        brandId: params.brandId,
        name: params.name,
        slug: params.slug,
        description: params.description,
        status: 'PUBLISHED',
      },
    });

    for (const v of params.variants) {
      // B. Variant
      await prisma.productVariant.create({
        data: {
          id: v.id,
          productId: params.id,
          sku: v.sku,
          price: v.price,
          weight: v.weight,
          color: v.color,
          connectivity: v.connectivity,
          cpu: v.cpu,
          ram: v.ram,
          storage: v.storage,
          display: v.display,
          gpu: v.gpu,
          os: v.os,
          battery: v.battery,
          switchType: v.switchType,
          layout: v.layout,
          formFactor: v.formFactor,
          dpi: v.dpi,
          buttons: v.buttons,
          sensor: v.sensor,
        },
      });

      // C. Image
      await prisma.productImage.create({
        data: {
          id: uuidv7(),
          productId: params.id,
          variantId: v.id,
          url: params.imageUrl,
          altText: `${params.name} - ${v.sku}`,
          order: 0,
        },
      });

      // D. Inventory
      await prisma.inventory.create({
        data: {
          id: uuidv7(),
          variantId: v.id,
          quantity: v.quantity,
          reservedQuantity: 0,
        },
      });
    }
  };

  // 6. Seed Products & Variants
  console.log('Seeding products, variants, images, and inventory...');

  // Product 1: MacBook Pro 14 M3
  const prodMacBookId = uuidv7();
  const vMacBook1Id = uuidv7();
  const vMacBook2Id = uuidv7();
  await createProductWithVariants({
    id: prodMacBookId,
    categoryId: catLaptopsId,
    brandId: brandAppleId,
    name: 'MacBook Pro 14 inch M3',
    slug: 'macbook-pro-14-inch-m3',
    description: 'MacBook Pro 14 inch trang bị chip M3 mang lại hiệu năng đột phá, màn hình Liquid Retina XDR sắc nét và thời lượng pin ấn tượng lên đến 22 giờ.',
    imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=600',
    variants: [
      {
        id: vMacBook1Id,
        sku: 'macbook-pro-14-m3-8-512',
        price: 39990000,
        weight: 1.55,
        color: 'Space Gray',
        cpu: 'Apple M3 8-core CPU',
        ram: '8GB Unified Memory',
        storage: '512GB SSD',
        display: '14.2 inch Liquid Retina XDR',
        gpu: '10-core GPU',
        os: 'macOS Sonoma',
        battery: '70Wh',
        quantity: 50,
      },
      {
        id: vMacBook2Id,
        sku: 'macbook-pro-14-m3-16-1t',
        price: 49990000,
        weight: 1.55,
        color: 'Silver',
        cpu: 'Apple M3 8-core CPU',
        ram: '16GB Unified Memory',
        storage: '1TB SSD',
        display: '14.2 inch Liquid Retina XDR',
        gpu: '10-core GPU',
        os: 'macOS Sonoma',
        battery: '70Wh',
        quantity: 35,
      },
    ],
  });

  // Product 2: ASUS ROG Zephyrus G14
  const prodAsusId = uuidv7();
  const vAsus1Id = uuidv7();
  await createProductWithVariants({
    id: prodAsusId,
    categoryId: catLaptopsId,
    brandId: brandAsusId,
    name: 'ASUS ROG Zephyrus G14',
    slug: 'asus-rog-zephyrus-g14',
    description: 'Laptop gaming nhỏ gọn 14 inch mạnh mẽ nhất thế giới với chip AMD Ryzen và card đồ họa NVIDIA RTX, màn hình ROG Nebula HDR siêu đỉnh.',
    imageUrl: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?q=80&w=600',
    variants: [
      {
        id: vAsus1Id,
        sku: 'rog-zephyrus-g14-3060',
        price: 35990000,
        weight: 1.6,
        color: 'Eclipse Gray',
        cpu: 'AMD Ryzen 7 5800HS',
        ram: '16GB DDR4',
        storage: '512GB NVMe SSD',
        display: '14 inch QHD 120Hz',
        gpu: 'NVIDIA GeForce RTX 3060 6GB',
        os: 'Windows 11 Home',
        battery: '76Wh',
        quantity: 20,
      },
    ],
  });

  // Product 3: iPhone 16 Pro
  const prodIPhoneId = uuidv7();
  const vIPhone1Id = uuidv7();
  const vIPhone2Id = uuidv7();
  await createProductWithVariants({
    id: prodIPhoneId,
    categoryId: catPhonesId,
    brandId: brandAppleId,
    name: 'iPhone 16 Pro',
    slug: 'iphone-16-pro',
    description: 'iPhone 16 Pro sở hữu vỏ titan bền bỉ, nút Camera Control thế hệ mới, chip A18 Pro siêu mạnh và hệ thống camera nâng cấp toàn diện.',
    imageUrl: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?q=80&w=600',
    variants: [
      {
        id: vIPhone1Id,
        sku: 'iphone-16-pro-128-black',
        price: 28990000,
        weight: 0.199,
        color: 'Black Titanium',
        connectivity: '5G, Wi-Fi 7',
        cpu: 'A18 Pro chip',
        storage: '128GB',
        display: '6.3 inch Super Retina XDR OLED',
        os: 'iOS 18',
        quantity: 100,
      },
      {
        id: vIPhone2Id,
        sku: 'iphone-16-pro-256-gold',
        price: 31990000,
        weight: 0.199,
        color: 'Desert Titanium',
        connectivity: '5G, Wi-Fi 7',
        cpu: 'A18 Pro chip',
        storage: '256GB',
        display: '6.3 inch Super Retina XDR OLED',
        os: 'iOS 18',
        quantity: 80,
      },
    ],
  });

  // Product 4: Sony WH-1000XM5
  const prodSonyId = uuidv7();
  const vSony1Id = uuidv7();
  const vSony2Id = uuidv7();
  await createProductWithVariants({
    id: prodSonyId,
    categoryId: catAudioId,
    brandId: brandSonyId,
    name: 'Tai nghe Sony WH-1000XM5',
    slug: 'sony-wh-1000xm5',
    description: 'Tai nghe chống ồn chủ động không dây đỉnh cao, chất âm trung thực tinh tế cùng thời lượng pin 30 giờ và công nghệ sạc cực nhanh.',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600',
    variants: [
      {
        id: vSony1Id,
        sku: 'sony-wh1000xm5-black',
        price: 8490000,
        weight: 0.25,
        color: 'Black',
        connectivity: 'Bluetooth 5.2, LDAC',
        battery: '30 hours duration',
        quantity: 40,
      },
      {
        id: vSony2Id,
        sku: 'sony-wh1000xm5-silver',
        price: 8490000,
        weight: 0.25,
        color: 'Silver',
        connectivity: 'Bluetooth 5.2, LDAC',
        battery: '30 hours duration',
        quantity: 30,
      },
    ],
  });

  // Product 5: Keychron K2 V2
  const prodKeychronId = uuidv7();
  const vKeychron1Id = uuidv7();
  const vKeychron2Id = uuidv7();
  await createProductWithVariants({
    id: prodKeychronId,
    categoryId: catKeyboardsId,
    brandId: brandKeychronId,
    name: 'Bàn phím cơ Keychron K2 V2',
    slug: 'keychron-k2-v2',
    description: 'Bàn phím cơ không dây nhỏ gọn layout 84 phím (75%), hỗ trợ kết nối Bluetooth/Wired và tương thích tốt nhất cho macOS/Windows.',
    imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?q=80&w=600',
    variants: [
      {
        id: vKeychron1Id,
        sku: 'keychron-k2-red-switch',
        price: 1890000,
        weight: 0.79,
        color: 'Gray-Black',
        connectivity: 'Bluetooth 5.1 & Wired',
        switchType: 'Gateron G Pro Red (Linear)',
        layout: '84-key ANSI',
        formFactor: '75%',
        quantity: 60,
      },
      {
        id: vKeychron2Id,
        sku: 'keychron-k2-blue-switch',
        price: 1890000,
        weight: 0.79,
        color: 'Gray-Black',
        connectivity: 'Bluetooth 5.1 & Wired',
        switchType: 'Gateron G Pro Blue (Clicky)',
        layout: '84-key ANSI',
        formFactor: '75%',
        quantity: 40,
      },
    ],
  });

  // Product 6: Logitech G Pro X Superlight
  const prodLogitechId = uuidv7();
  const vLogitech1Id = uuidv7();
  const vLogitech2Id = uuidv7();
  await createProductWithVariants({
    id: prodLogitechId,
    categoryId: catMiceId,
    brandId: brandLogitechId,
    name: 'Chuột Logitech G Pro X Superlight',
    slug: 'logitech-g-pro-x-superlight',
    description: 'Chuột chơi game không dây nhẹ nhất thế giới dưới 63 gram, sử dụng cảm biến HERO 25K cho độ chính xác cao và kết nối không dây LIGHTSPEED siêu tốc.',
    imageUrl: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?q=80&w=600',
    variants: [
      {
        id: vLogitech1Id,
        sku: 'g-pro-x-superlight-black',
        price: 3190000,
        weight: 0.063,
        color: 'Black',
        connectivity: 'LIGHTSPEED Wireless',
        dpi: 25600,
        buttons: 5,
        sensor: 'HERO 25K',
        quantity: 50,
      },
      {
        id: vLogitech2Id,
        sku: 'g-pro-x-superlight-white',
        price: 3190000,
        weight: 0.063,
        color: 'White',
        connectivity: 'LIGHTSPEED Wireless',
        dpi: 25600,
        buttons: 5,
        sensor: 'HERO 25K',
        quantity: 45,
      },
    ],
  });

  console.log('✓ Products & variants seeded.');

  // 7. Seed Campaigns & Promotions
  console.log('Seeding promotions & campaigns...');
  const campaignId = uuidv7();
  const now = new Date();
  const startsAt = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
  const endsAt = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000); // 15 days from now

  await prisma.campaign.create({
    data: {
      id: campaignId,
      name: 'Khai Trương Techstore',
      description: 'Mừng khai trương cửa hàng công nghệ Techstore với nhiều ưu đãi lớn!',
      startsAt,
      endsAt,
      isActive: true,
    },
  });

  const promotionId = uuidv7();
  await prisma.promotion.create({
    data: {
      id: promotionId,
      campaignId: campaignId,
      name: 'Khuyến mãi khai trương ASUS ROG',
      description: 'Giảm giá khủng cho dòng sản phẩm gaming ASUS ROG',
      priority: 1,
      startsAt,
      endsAt,
      isActive: true,
    },
  });

  await prisma.promotionProduct.create({
    data: {
      id: uuidv7(),
      promotionId: promotionId,
      scope: 'PRODUCT',
      productId: prodAsusId,
      discountType: 'FIXED_AMOUNT',
      discountValue: 2000000, // Giảm thẳng 2 triệu
    },
  });
  console.log('✓ Campaigns & promotions seeded.');

  // 8. Seed Coupons
  console.log('Seeding coupons...');
  await prisma.coupon.create({
    data: {
      id: uuidv7(),
      campaignId: campaignId,
      code: 'BIGSALE',
      discountType: 'FIXED_AMOUNT',
      discountValue: 500000, // Giảm 500k
      minOrderValue: 5000000,
      maxDiscount: null,
      usageLimit: 100,
      perUserLimit: 1,
      startsAt,
      endsAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
  });
  console.log('✓ Coupons seeded.');

  // 9. Seed Orders, OrderItems, Payments, Shipments
  console.log('Seeding orders, payments, and shipments...');

  const order1Id = uuidv7();
  const orderItem1Id = uuidv7();
  const payment1Id = uuidv7();
  const shipment1Id = uuidv7();

  // Order 1: Delivered, Paid, Bank Transfer
  await prisma.order.create({
    data: {
      id: order1Id,
      orderNumber: 'ORD-2026-0001',
      userId: customerId,
      addressId: address1Id,
      status: 'DELIVERED',
      paymentStatus: 'PAID',
      subtotal: 8490000,
      discountAmount: 0,
      shippingFee: 30000,
      total: 8520000,
      notes: 'Giao giờ hành chính',
      shippingSnapshot: {
        fullName: 'John Doe',
        phone: '0987654321',
        addressLine: '123 Đường Xuân Thủy',
        provinceName: 'Hà Nội',
        districtName: 'Quận Tây Hồ',
        wardName: 'Phường Phú Thượng',
      },
      createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
    },
  });

  await prisma.orderItem.create({
    data: {
      id: orderItem1Id,
      orderId: order1Id,
      variantId: vSony1Id,
      quantity: 1,
      unitPrice: 8490000,
      total: 8490000,
      variantSnapshot: {
        sku: 'sony-wh1000xm5-black',
        price: '8490000',
        color: 'Black',
        connectivity: 'Bluetooth 5.2, LDAC',
      },
    },
  });

  await prisma.payment.create({
    data: {
      id: payment1Id,
      orderId: order1Id,
      method: 'BANK_TRANSFER',
      status: 'PAID',
      amount: 8520000,
      transactionId: 'TXN123456789',
      paidAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.shipment.create({
    data: {
      id: shipment1Id,
      orderId: order1Id,
      carrier: 'GHN',
      trackingNumber: 'GHN-100200300',
      status: 'DELIVERED',
      estimatedDeliveryAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
      deliveredAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
    },
  });

  // Order 2: Pending, COD
  const order2Id = uuidv7();
  const orderItem2Id = uuidv7();
  const orderItem3Id = uuidv7();

  await prisma.order.create({
    data: {
      id: order2Id,
      orderNumber: 'ORD-2026-0002',
      userId: customerId,
      addressId: address2Id,
      status: 'PENDING',
      paymentStatus: 'PENDING',
      subtotal: 5080000, // 1890000 (keychron) + 3190000 (logitech)
      discountAmount: 0,
      shippingFee: 30000,
      total: 5110000,
      notes: 'Gọi trước khi giao',
      shippingSnapshot: {
        fullName: 'John Doe (Công ty)',
        phone: '0912345678',
        addressLine: 'Toà nhà Bitexco, Lầu 25',
        provinceName: 'Hồ Chí Minh',
        districtName: 'Quận 3',
        wardName: 'Phường 10',
      },
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    },
  });

  await prisma.orderItem.create({
    data: {
      id: orderItem2Id,
      orderId: order2Id,
      variantId: vKeychron1Id,
      quantity: 1,
      unitPrice: 1890000,
      total: 1890000,
      variantSnapshot: {
        sku: 'keychron-k2-red-switch',
        price: '1890000',
        color: 'Gray-Black',
        switchType: 'Gateron G Pro Red (Linear)',
      },
    },
  });

  await prisma.orderItem.create({
    data: {
      id: orderItem3Id,
      orderId: order2Id,
      variantId: vLogitech1Id,
      quantity: 1,
      unitPrice: 3190000,
      total: 3190000,
      variantSnapshot: {
        sku: 'g-pro-x-superlight-black',
        price: '3190000',
        color: 'Black',
        sensor: 'HERO 25K',
      },
    },
  });

  // Order 3: Cancelled, Refunded, VNPAY
  const order3Id = uuidv7();
  const orderItem4Id = uuidv7();
  const payment3Id = uuidv7();

  await prisma.order.create({
    data: {
      id: order3Id,
      orderNumber: 'ORD-2026-0003',
      userId: customerId,
      addressId: address1Id,
      status: 'CANCELLED',
      paymentStatus: 'REFUNDED',
      subtotal: 35990000,
      discountAmount: 0,
      shippingFee: 30000,
      total: 36020000,
      cancelReason: 'Thay đổi nhu cầu mua hàng',
      shippingSnapshot: {
        fullName: 'John Doe',
        phone: '0987654321',
        addressLine: '123 Đường Xuân Thủy',
        provinceName: 'Hà Nội',
        districtName: 'Quận Tây Hồ',
        wardName: 'Phường Phú Thượng',
      },
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    },
  });

  await prisma.orderItem.create({
    data: {
      id: orderItem4Id,
      orderId: order3Id,
      variantId: vAsus1Id,
      quantity: 1,
      unitPrice: 35990000,
      total: 35990000,
      variantSnapshot: {
        sku: 'rog-zephyrus-g14-3060',
        price: '35990000',
        color: 'Eclipse Gray',
      },
    },
  });

  await prisma.payment.create({
    data: {
      id: payment3Id,
      orderId: order3Id,
      method: 'VNPAY',
      status: 'REFUNDED',
      amount: 36020000,
      transactionId: 'VNPAY999888',
      paidAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    },
  });

  console.log('✓ Orders, payments, and shipments seeded.');

  // 10. Seed Reviews for delivered items
  console.log('Seeding reviews...');
  await prisma.review.create({
    data: {
      id: uuidv7(),
      productId: prodSonyId,
      variantId: vSony1Id,
      userId: customerId,
      orderItemId: orderItem1Id,
      rating: 5,
      title: 'Tuyệt vời, đáng mua!',
      body: 'Âm thanh cực đỉnh, chống ồn rất tốt. Đeo lâu không bị đau tai. Rất đáng đồng tiền bát gạo!',
      isVerifiedPurchase: true,
      createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    },
  });
  console.log('✓ Reviews seeded.');

  console.log('=== DATABASE SEEDING COMPLETED SUCCESSFULLY ===');
}

main()
  .catch((e) => {
    console.error('Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
