const dns = require("dns");

dns.setDefaultResultOrder("ipv4first");

dns.resolveSrv(
  "_mongodb._tcp.cluster0.qripcro.mongodb.net",
  (err, records) => {
    if (err) {
      console.error(err);
    } else {
      console.log(records);
    }
  }
);