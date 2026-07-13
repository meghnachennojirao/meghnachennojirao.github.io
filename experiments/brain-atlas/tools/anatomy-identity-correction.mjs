export const EXPECTED_OFFICIAL_SHA256 = "2B9AD5B53E40E9F0936DA74F7BE38D2EED15604E26358C3870A0EA13499B9A35";
export const EXPECTED_CORRECTED_SOURCE_SHA256 = "BE7681648288E1C27627800393468ADF8D8A49942BE78F337E3AEAEE437CF9BE";

// Current NIH/HRA source name -> anatomical identity of its attached geometry.
export const IDENTITY_CORRECTIONS = new Map([
  ["optic_radiation", "posteroventral_putamen"],
  ["posteroventral_putamen", "paracingulate_gyrus"],
  ["atrium_of_lateral_ventricle", "rostral_gyrus"],
  ["paracingulate_gyrus", "frontomarginal_gyrus"],
  ["rostral_gyrus", "frontal_pole"],
  ["frontomarginal_gyrus", "perirhinal_gyrus_rostral_part_of_FuGt"],
  ["frontal_pole", "optic_radiation"],
  ["perirhinal_gyrus_rostral_part_of_FuGt", "atrium_of_lateral_ventricle"],
]);

export const ATLAS_IDS = new Map([
  ["posteroventral_putamen", 146034754],
  ["paracingulate_gyrus", 146034872],
  ["rostral_gyrus", 146034876],
  ["frontomarginal_gyrus", 146034884],
  ["frontal_pole", 146034888],
  ["perirhinal_gyrus_rostral_part_of_FuGt", 146034892],
  ["optic_radiation", 266441621],
  ["atrium_of_lateral_ventricle", 266441657],
]);
