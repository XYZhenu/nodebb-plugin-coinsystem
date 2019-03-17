const db = require.main.require('./src/database');
var nconf = require.main.require('nconf');
var async = require.main.require('async');
var winston = require.main.require('winston');

const CoinSystem = {
    init(parma,callback){
        if (nconf.get('database') === 'mongo') {
            async.waterfall([
                function(next) {
                    db.client.collection('coinsystem').createIndex({_key: 1, coin: -1}, {background: true, sparse: true}, next);
                }
            ],function (err) { 
                if (err) {
                    winston.error('[coinsystem] failed create index'+ err);
                }
            })
        // } else if (nconf.get('database') === 'redis'){
        }
        return setImmediate(callback, null);
    },

    updateCoin(parma) {
        if (parma.field === 'reputation') {
            async.waterfall([
                function(next) {
                    db.client.collection('coinsystem').findOne({ _key: 'coin:'+parma.uid }, function (err,result) {
                        if (err) {
                            next(err,null);
                        } else {
                            next(null,result || {reputation:0,coin:0});
                        }
                    })
                },
                function (doc,next) {
                    let previous = doc.reputation || 0;
                    let coin = doc.coin + parma.value - previous
                    db.client.collection('coinsystem').findOneAndUpdate({ _key: 'coin:'+parma.uid }, { $set: {coin:coin, reputation:parma.value}}, { returnOriginal: false, upsert: true }, function (err, result) {
                        if (err) {
                            next(err, null);
                        } else {
                            next(null);
                        }
                    })
                }
            ],function (err) {
                if (err) {
                    winston.error('[coinsystem] failed'+err);
                }
            })
        }
    }
}

function _incrCoinField(key, field, value, callback) {
    callback = callback || function (q,w) { };
    value = parseInt(value, 0);
    
    if (!key || isNaN(value)) {
        return callback(null, null);
    }

    var data = {};
    data[field] = value;

    db.client.collection('coinsystem').findOneAndUpdate({ _key: key }, { $inc: data }, { projection : data, returnOriginal: false, upsert: true }, function (err, result) {
        if (err) {
            return callback(err);
        }
        callback(null, result && result.value ? result.value[field] : null);
    });
}

module.exports = CoinSystem;