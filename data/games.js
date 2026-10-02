/* Board Game Fest Table Finder · games
   Emblems are original, simplified geometric marks (viewBox 0 0 48 48, currentColor).
   They evoke each game's world and never reproduce the publishers' logos. */
(function () {
  var S = 'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" aria-hidden="true" focusable="false"';
  window.BGF_GAMES = [
    {
      id: 'dobble', name: { fr: 'Dobble', en: 'Spot it!' },
      tag: { fr: 'Ambiance', en: 'Party' }, players: '2-8', duration: '15', color: '#FF4D8D',
      emblem: '<svg ' + S + ' fill="currentColor"><path fill-rule="evenodd" d="M24 2.5a21.5 21.5 0 1 1 0 43 21.5 21.5 0 0 1 0-43zm0 4a17.5 17.5 0 1 0 0 35 17.5 17.5 0 0 0 0-35z"/><path d="M24 9.5l2.3 4.7 5.2.8-3.8 3.6.9 5.1-4.6-2.4-4.6 2.4.9-5.1-3.8-3.6 5.2-.8z"/><circle cx="14.5" cy="28" r="4.2"/><rect x="28" y="25" width="8" height="8" rx="1.5" transform="rotate(18 32 29)"/><path d="M24 31.5l4.6 7.5h-9.2z"/></svg>'
    },
    {
      id: 'exploding-kittens', name: { fr: 'Exploding Kittens', en: 'Exploding Kittens' },
      tag: { fr: 'Ambiance', en: 'Party' }, players: '2-5', duration: '15', color: '#FF6B2C',
      emblem: '<svg ' + S + ' fill="currentColor"><path fill-rule="evenodd" d="M9.5 21L11.5 9l8.5 7.2h8L36.5 9l2 12c1.7 2.6 2.7 5.6 2.7 8.6 0 8.2-7.7 13.4-17.2 13.4S6.8 37.8 6.8 29.6c0-3 1-6 2.7-8.6zM18 25.6a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6zm12 0a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6zM21.5 35h5L24 37.6z"/><path d="M38 8.5c1.5-2.8 4-3.7 6-3" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M45 1.5l.9 2.2 2.1.4-1.6 1.5.4 2.2-1.8-1.1-1.9 1.1.4-2.2-1.6-1.5 2.2-.4z"/></svg>'
    },
    {
      id: 'loups-garous', name: { fr: 'Les Loups-Garous de Thiercelieux', en: 'Werewolves' },
      short: { fr: 'Loups-Garous', en: 'Werewolves' },
      tag: { fr: 'Bluff', en: 'Social deduction' }, players: '8-18', duration: '30', color: '#3D2C7A',
      emblem: '<svg ' + S + ' fill="currentColor"><path d="M30.2 6.1A18.5 18.5 0 1 0 30.2 41.9 20.5 20.5 0 0 1 30.2 6.1z"/><path d="M38.5 9l1.3 3.2 3.2 1.3-3.2 1.3-1.3 3.2-1.3-3.2-3.2-1.3 3.2-1.3zM42 25l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z"/><path d="M33 31.5l4-4.5 1.2 4.4 4.8 1.6-3.4 3.6-.4 4.4-3.8-2.6-4.4.6.6-4.2z" opacity=".55"/></svg>'
    },
    {
      id: 'ticket-to-ride', name: { fr: 'Les Aventuriers du Rail', en: 'Ticket to Ride' },
      short: { fr: 'Aventuriers du Rail', en: 'Ticket to Ride' },
      tag: { fr: 'Familial', en: 'Family' }, players: '2-5', duration: '45', color: '#1F6FE0',
      emblem: '<svg ' + S + ' fill="currentColor"><path d="M6 18h24v14H6zM10 9.5h6.5V18H10zM6 24l-4 8h4z"/><path fill-rule="evenodd" d="M30 9h13v23H30zm3.5 3.5v6.5h6v-6.5z"/><circle cx="12" cy="36" r="4.5"/><circle cx="24" cy="36" r="4.5"/><circle cx="36.5" cy="36" r="4.5"/><rect x="1" y="42.5" width="46" height="2.6" rx="1.3"/></svg>'
    },
    {
      id: 'catan', name: { fr: 'CATAN', en: 'CATAN' },
      tag: { fr: 'Stratégie', en: 'Strategy' }, players: '3-4', duration: '75', color: '#D4471F',
      emblem: '<svg ' + S + ' fill="currentColor"><path fill-rule="evenodd" d="M24 3l18.2 10.5v21L24 45 5.8 34.5v-21zm0 11L15.3 19v10l8.7 5 8.7-5V19z"/><circle cx="24" cy="24" r="3.6"/></svg>'
    },
    {
      id: '7-wonders', name: { fr: '7 Wonders', en: '7 Wonders' },
      tag: { fr: 'Stratégie', en: 'Strategy' }, players: '3-7', duration: '30', color: '#A8742A',
      emblem: '<svg ' + S + ' fill="currentColor"><path d="M3 42h42v-6H3zM8.5 34h31v-6.5h-31zM14 25.5h20V19H14zM19 17h10v-5.5H19z"/><path d="M24 3l5 6.5H19z"/></svg>'
    },
    {
      id: 'dixit', name: { fr: 'Dixit', en: 'Dixit' },
      tag: { fr: 'Imagination', en: 'Storytelling' }, players: '3-8', duration: '30', color: '#8B4DFF',
      emblem: '<svg ' + S + ' fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="10.5" y="5" width="27" height="38" rx="4.5" transform="rotate(-9 24 24)"/><path d="M24.6 24.4a1.8 1.8 0 1 1-1.9-2.1 4.4 4.4 0 0 1 4.6 4.5 6.9 6.9 0 0 1-7 6.8 9.4 9.4 0 0 1-9.2-9.5"/><path d="M30 12.5l.01 0M33.5 17l.01 0" stroke-width="3.6"/></svg>'
    },
    {
      id: 'just-one', name: { fr: 'Just One', en: 'Just One' },
      tag: { fr: 'Coopératif', en: 'Co-op' }, players: '3-7', duration: '20', color: '#00A6F0',
      emblem: '<svg ' + S + ' fill="currentColor"><path fill-rule="evenodd" d="M8.5 6h31A4.5 4.5 0 0 1 44 10.5v21a4.5 4.5 0 0 1-4.5 4.5H23l-9.5 8.5V36h-5A4.5 4.5 0 0 1 4 31.5v-21A4.5 4.5 0 0 1 8.5 6zM21.2 14.5l5.5-3.2h3.5V31h-5.2V17.8l-3.8 1.9z"/></svg>'
    },
    {
      id: 'unlock', name: { fr: 'Unlock!', en: 'Unlock!' },
      tag: { fr: 'Escape game', en: 'Escape room' }, players: '1-6', duration: '60', color: '#24406B',
      emblem: '<svg ' + S + ' fill="currentColor"><path d="M14.5 21v-6.2a9.5 9.5 0 0 1 18.4-3.3" fill="none" stroke="currentColor" stroke-width="4.4" stroke-linecap="round"/><path fill-rule="evenodd" d="M10 21h28a3.5 3.5 0 0 1 3.5 3.5v15A3.5 3.5 0 0 1 38 43H10a3.5 3.5 0 0 1-3.5-3.5v-15A3.5 3.5 0 0 1 10 21zm14 4.6a3.6 3.6 0 0 0-1.9 6.7l-1 5.4h5.8l-1-5.4a3.6 3.6 0 0 0-1.9-6.7z"/></svg>'
    },
    {
      id: 'splendor', name: { fr: 'Splendor', en: 'Splendor' },
      tag: { fr: 'Collection', en: 'Engine building' }, players: '2-4', duration: '30', color: '#0E8C83',
      emblem: '<svg ' + S + ' fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"><path d="M14 7h20l10 12.5L24 43 4 19.5z"/><path d="M4 19.5h40M18 19.5l6 23.5 6-23.5M14 7l4 12.5L24 7l6 12.5L34 7"/></svg>'
    },
    {
      id: 'pandemic', name: { fr: 'Pandemic', en: 'Pandemic' },
      tag: { fr: 'Coopératif', en: 'Co-op' }, players: '2-4', duration: '45', color: '#1D8A4E',
      emblem: '<svg ' + S + ' fill="currentColor"><path d="M10 12l14 12M37 9L24 24M39 35L24 24M12 37l12-13M10 12l27-3M39 35L12 37" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><circle cx="10" cy="12" r="4.4"/><circle cx="37" cy="9" r="3.6"/><circle cx="39" cy="35" r="4.4"/><circle cx="12" cy="37" r="3.6"/><path fill-rule="evenodd" d="M24 16a8 8 0 1 1 0 16 8 8 0 0 1 0-16zm-1.6 3.2v3.2h-3.2v3.2h3.2v3.2h3.2v-3.2h3.2v-3.2h-3.2v-3.2z"/></svg>'
    },
    {
      id: 'love-letter', name: { fr: 'Love Letter', en: 'Love Letter' },
      tag: { fr: 'Bluff', en: 'Bluffing' }, players: '2-6', duration: '20', color: '#C2185B',
      emblem: '<svg ' + S + ' fill="currentColor"><path d="M7.5 10h33A3.5 3.5 0 0 1 44 13.5v21a3.5 3.5 0 0 1-3.5 3.5h-33A3.5 3.5 0 0 1 4 34.5v-21A3.5 3.5 0 0 1 7.5 10z" fill="none" stroke="currentColor" stroke-width="3"/><path d="M5.5 12.5L24 26l18.5-13.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><path d="M24 40.5s-8.5-5-8.5-10.6a4.4 4.4 0 0 1 8.5-1.9 4.4 4.4 0 0 1 8.5 1.9c0 5.6-8.5 10.6-8.5 10.6z"/></svg>'
    }
  ];
})();
