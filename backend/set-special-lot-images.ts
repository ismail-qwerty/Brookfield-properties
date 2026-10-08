import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// One Unsplash photo per special lot, picked to match the lot's name (its
// neighborhood or the kind of home it describes). All are free-license
// Unsplash photos, hotlinked from Unsplash's CDN like the lots used before.
const PHOTOS: Record<string, string> = {
  'Astoria Queens Apartment': 'photo-1512621480870-77463b1b90c7',
  'Crown Heights Garden Unit': 'photo-1782743274169-90b67407f865',
  'Bushwick Artist Loft': 'photo-1739428966168-41352827a54b',
  'Alphabet City Renovated Unit': 'photo-1569152811536-fb47aced8409',
  'Long Island City Studio': 'photo-1768037161948-2e79b48be907',
  'Morningside Heights Unit': 'photo-1769649632183-0d9fea619780',
  "Hell's Kitchen Modern Studio": 'photo-1702014862053-946a122b920d',
  'Red Hook Waterfront Unit': 'photo-1719151465160-72a43edaa5b4',
  'East Village Walk-Up': 'photo-1528490698874-3fdd6f1ff49f',
  'Fort Greene Historic Unit': 'photo-1762216454185-71127f1d4a95',
  'Greenwich Village Corner Unit': 'photo-1775996960565-5a1d977eb75e',
  'Kips Bay High-Rise Unit': 'photo-1624204386084-dd8c05e32226',
  'Lower Manhattan Loft Space': 'photo-1505873242700-f289a29e1e0f',
  'Prospect Heights Corner Unit': 'photo-1557500608-1c483bc8d90d',
  'Murray Hill Executive Suite': 'photo-1775866914882-9f0d58aa3372',
  'Gowanus Industrial Loft': 'photo-1761519609290-4f0034288007',
  'Williamsburg Warehouse Conversion': 'photo-1789364261402-2b8ecf3198d8',
  'Midtown South Office Conversion': 'photo-1788351163074-57a11c8bc030',
  'Cobble Hill Charmer': 'photo-1608845920884-3c88800feebc',
  'SoHo Artist Studio': 'photo-1719917226575-c23bdc09c221',
  'Union Square Plaza Apartment': 'photo-1568651248776-c94b50d626ff',
  'NoHo Designer Loft': 'photo-1619989652700-9984844cb0ea',
  'Downtown Brooklyn Tower': 'photo-1707367147842-9a3e5e77a86e',
  'Battery Park Waterfront Unit': 'photo-1618139639109-05af16d50c61',
  'Nolita Boutique Building': 'photo-1689426845535-4335306d2547',
  'Boerum Hill Luxury Rental': 'photo-1688646953306-5ec93eab8c06',
  'Park Slope Family Duplex': 'photo-1684803873503-f335c07eb95c',
  'Carroll Gardens Duplex': 'photo-1762216454185-4bca7b059d09',
  'Theater District Premium Suite': 'photo-1770328095130-cc16b4e41e0f',
  'Tribeca Loft Apartment': 'photo-1578655346479-43374d29a412',
  'Flatiron District Corner Loft': 'photo-1496871455396-14e56815f1f4',
  'West Village Brownstone Suite': 'photo-1459535653751-d571815e906b',
  'Brooklyn Heights Townhouse': 'photo-1722179320614-77669c9ac0b9',
  'Upper West Side Classic Six': 'photo-1763429307470-f8fff541fff7',
  'Financial District High-Rise': 'photo-1480714378408-67cf0d13bc1b',
  'Dumbo Loft with Bridge Views': 'photo-1492666673288-3c4b4576ad9a',
  'Chelsea Market District Condo': 'photo-1621251360844-38b754c41a80',
  'Hudson Yards Premium Unit': 'photo-1768295982368-3aa45f9e7a6c',
  'Gramercy Park Residence': 'photo-1618990908950-fd1a23294d11',
  'Upper East Side Penthouse': 'photo-1784601543278-7c2550e6a72e',
};

async function setSpecialLotImages() {
  let updated = 0;

  for (const [name, photo] of Object.entries(PHOTOS)) {
    const { data, error } = await supabase
      .from('properties')
      .update({ image_url: `https://images.unsplash.com/${photo}?w=800&auto=format&fit=crop&q=80` })
      .eq('lot_type', 'special')
      .eq('name', name)
      .select('id');

    if (error) {
      console.error(`✗ ${name}: ${error.message}`);
    } else if (!data || data.length === 0) {
      console.warn(`- ${name}: no special lot with this name`);
    } else {
      console.log(`✓ ${name}`);
      updated += data.length;
    }
  }

  console.log(`\nUpdated ${updated} special lot(s).`);
}

setSpecialLotImages();
