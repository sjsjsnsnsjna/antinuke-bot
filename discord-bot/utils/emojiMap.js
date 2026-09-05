'use strict';

// Sunucudaki özel emojiler (NOVA dökümünden alındı, tümü Burtyper sunucusunda mevcut)
// Kullanım: const e = require('./emojiMap');  e.success -> "✅" gibi
// Ya da dinamik: e.byName('tick')

const ANIMATED = {
  discordnitro: '1545369343351853098',
  demoncat: '1545369388264464474',
  discord: '1545384448793649243',
  loading: '1545384491932065803',
  money: '1545405357545750639',
  approved: '1545405360905650176',
  nuke: '1545405365980499989',
  fire: '1545405369919209504',
  fingerwag: '1545405371923824690',
  tick: '1545405376592220221',
  loader: '1545405381096902686',
  ban: '1545405384364134481',
  diamond: '1545405389200425030',
  hearthands: '1545405394640175125',
  lightning: '1545405399014969444',
  sirene: '1545405402106306670',
  vlh: '1545405411287498802',
  watchingnetflix: '1545405414525374575',
  briefcase: '1545405421282398288',
  tick2: '1545405425174843472',
  hellowave: '1545405428371038289',
  error: '1545405430019264543',
  car: '1545405432732844082',
  tick3: '1545405436121972776',
  mute: '1545405441683619923',
  _9417411436: '1545405443642499092',
  attention: '1545405445399904316',
  spinninglogo: '1545405449862651914',
  amogustwerk: '1545405455537410058',
  alert: '1545405459811405884',
  recyclebin: '1545405461979996160',
  rt: '1545405464525803651',
  tick4: '1545405471224111115',
  water: '1545405478861803652',
  nitro: '1545405483152572446',
  shoppingcart: '1545405488332673096',
  event: '1545405491738443877',
  catlaugh: '1545405495773241455',
  diamond2: '1545405503415521330',
  booster: '1545405511774502952',
  loading2: '1545405515276754989',
  estrela: '1545405518246314065',
  diamondannouncer: '1545405525716635678',
  drex: '1545405531366105098',
  fire2: '1545405538320523414',
  rocket: '1545405546180644884',
};

const STATIC = {
  partneredblurple: '1545369286967566357',
  bughunter: '1545369289064710164',
  discordnitrogoldbadge: '1545369290994090074',
  giftinghero: '1545369297637998612',
  discordcompletedaquestbadg: '1545369299479302154',
  blossom: '1545369301731639316',
  discordhypesquadbalancebad: '1545369303375679579',
  starratingids: '1545369304961253386',
  clydebot: '1545369307289231441',
  discordemeraldnitrobadge: '1545369308761165824',
  clydeterminal: '1545369310703128626',
  discordgoldbadge: '1545369312485838898',
  starratingids2: '1545369314465423420',
  discordfistbump: '1545369317523062824',
  discordmicrophone: '1545369320647823461',
  modshield: '1545369322229207110',
  whiterules: '1545369333029539881',
  discordcamp: '1545369337739612240',
  discordheart: '1545369340298133575',
  discordorbsbook: '1545369345956511804',
  discordwumpuscog: '1545369349706088469',
  starratingids3: '1545369351551717386',
  clydezzz: '1545369354273558649',
  discordautomodbadge: '1545369355905409024',
  discordrubynitrobadge: '1545369357410902057',
  giftinglegend: '1545369372040630442',
  discordnitrobronzebadge: '1545369374964056084',
  discordlegendchest: '1545369378785329173',
  discordrubberduck: '1545369382988025957',
  cash: '1545369384464285697',
  maple: '1545369386460647494',
  giftingpatron: '1545369390042710106',
  discordclyde: '1545369394581082122',
  clydehappy: '1545369396808261712',
  diamond: '1545369398314016790',
  discordwumpussale: '1545369401505742928',
  discordplatiumbadge: '1545369403086868480',
  yellowrules: '1545369411945234442',
  nitrolootboxmixed: '1545369414915063838',
  nitrolootboxnebula: '1545369417985040414',
  starratingids4: '1545369420006686730',
  clover: '1545369421739073576',
  discordbughunterbadge: '1545369423521517638',
  bluerules: '1545369432015249408',
  discordsupportscommandsbad: '1545369434669981817',
  discordnitroopalbadge: '1545369437660512256',
  discordplatinumnitrobadge: '1545369440324034652',
  discordeyeballs: '1545369443696377907',
  partnerids: '1545384388403920896',
  toxic: '1545384391016972359',
  discordverified: '1545384393714044969',
  security: '1545384396587270214',
  hypersquad: '1545384399728541776',
  switchenabled: '1545384403662802964',
  purpleheartservertag: '1545384405319688202',
  engagedinsuspectedspamactiv: '1545384409308598342',
  lockedvvc: '1545384410906624011',
  pinkheartservertag: '1545384413880393768',
  serverbooster: '1545384415923011634',
  discordspaceshuttle: '1545384419102036029',
  discordlogo: '1545384422919114792',
  offline: '1545384424848498738',
  online: '1545384427713073213',
  developer: '1545384429579673721',
  opalnitro: '1545384432754495558',
  dnd: '1545384435543703602',
  bughunter2: '1545384439582953492',
  boostergem24months: '1545384441348755547',
  grayheartservertag: '1545384445065043998',
  redheartservertag: '1545384451742367864',
  switchdisabled: '1545384454388711474',
  partnerids2: '1545384456062505020',
  quarantine: '1545384458692202577',
  crown: '1545384482989805660',
  staff: '1545384485023907940',
  screensharevolumemax: '1545384488098598932',
  securityfilter: '1545384494909882408',
  ownercrown: '1545384497552564265',
  moderator: '1545384510919680170',
  timeout: '1545384513876795493',
  partnerids3: '1545384515588063242',
  partnerids4: '1545384518502842368',
  discordeyeballs2: '1545384522076389496',
  security2: '1545384526052859915',
  memberexpelled: '1545384530842492949',
  purpleheartservertag2: '1545384532641976320',
  member: '1545384535552958566',
  pinkheartservertag2: '1545384538429984809',
  discordorbs: '1545384541840220190',
  discordlogo2: '1545384543920594964',
  nitroticket: '1545384547309457438',
  developer2: '1545384548982853673',
  greenheartservertag: '1545384551222616148',
  bughunter3: '1545384553387003924',
  discordorbs2: '1545384554964189316',
  burtyper_logo: '1545405946744799262',
  earlyverifiedbotdeveloperg: '1545407130943619172',
  earlyverifiedbotdeveloperr: '1545407132919406622',
  earlyverifiedbotdeveloperc: '1545407136043896932',
  earlyverifiedbotdeveloperm: '1545407140334932040',
  earlyverifiedbotdeveloperp: '1545407142352126042',
  earlyverifiedbotdevelopero: '1545407145443467354',
  earlyverifiedbotdeveloperw: '1545407149465673788',
};

function make(name, id) {
  return `<a:${name}:${id}>`;
}

function build() {
  const out = {};
  for (const [k, id] of Object.entries(ANIMATED)) out[k] = make(k, id);
  for (const [k, id] of Object.entries(STATIC)) out[k] = `<:${k}:${id}>`;
  return out;
}

const emoji = build();

// Semantik kısayollar (components.js'te kullanım için)
emoji.SUCCESS = emoji.tick;
emoji.ERROR = emoji.error;
emoji.WARN = emoji.attention;
emoji.ALERT = emoji.sirene;
emoji.BAN = emoji.ban;
emoji.FIRE = emoji.fire;
emoji.CROWN = emoji.ownercrown;
emoji.LOADING = emoji.loading;
emoji.MONEY = emoji.money;
emoji.DIAMOND = emoji.diamond;
emoji.SHIELD = emoji.modshield;
emoji.LOGO = emoji.burtyper_logo;

emoji.byName = n => emoji[n] || null;
emoji.all = () => Object.entries(emoji);

module.exports = emoji;
