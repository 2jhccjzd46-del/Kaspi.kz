if (!global._kaspi) {
  global._kaspi = {
    users: {
      "me": {
        id: "me",
        name: "Степан Писаренко",
        iin: "041226550627",
        phone: "+7 777 000 00 00",
        cardNumber: "4400 4301 0000 0000",
        balance: 135000,
        currency: "KZT",
        avatar: "Я",
        cardType: "Kaspi Gold"
      },
      "user2": {
        id: "user2",
        name: "АЙГУЛЬ СЕРИКОВНА",
        iin: "950315400123",
        phone: "+7 701 987 65 43",
        cardNumber: "4400 4301 8765 5678",
        balance: 89000,
        currency: "KZT",
        avatar: "АС"
      },
      "user3": {
        id: "user3",
        name: "ДАНИЯР АХМЕТОВ",
        iin: "880712300456",
        phone: "+7 705 555 33 22",
        cardNumber: "4400 4301 5555 3322",
        balance: 45000,
        currency: "KZT",
        avatar: "ДА"
      }
    },
    transactions: [
      {
        id: 1,
        userId: "me",
        type: "in",
        from: "АЙГУЛЬ СЕРИКОВНА",
        amount: 15000,
        comment: "За аренду",
        date: new Date(Date.now() - 86400000 * 2).toISOString()
      },
      {
        id: 2,
        userId: "me",
        type: "out",
        to: "ДАНИЯР АХМЕТОВ",
        amount: 5000,
        comment: "Обед",
        date: new Date(Date.now() - 86400000).toISOString()
      }
    ],
    files: []
  };
}

module.exports = {
  users: global._kaspi.users,
  transactions: global._kaspi.transactions,
  files: global._kaspi.files
};