'use strict';
require('dotenv').config()
const BootBot = require('bootbot');
const rp = require('request-promise');
const cheerio = require('cheerio');

const bot = new BootBot({
  accessToken: process.env.FB_ACCESS_TOKEN,
  verifyToken: process.env.FB_VERIFY_TOKEN,
  appSecret: process.env.FB_APP_SECRET,
});
rp('https://hardwarenews.wevolver.com/feed/')
// bot.setGetStartedButton('GET_STARTED')
bot.setGreetingText('Hey {{user_first_name}}, how\'s your day going? Glad to see you here today!')

var getFeatureImageUrl = function(postUrl) {
  return rp(postUrl)
  .then((htmlString) => {
    const $ = cheerio.load(htmlString);
    let link = $('.td-post-featured-image').find('img').attr('src')
    console.log(link)
    return link;
  })
  .catch((err) => {
    console.log(err);
    return "";
  });
}
var getWevolverFeed = function() {
  let links = [];
  let urls = [];
  return rp('https://hardwarenews.wevolver.com/feed/')
  .then((htmlString) => {
    const $ = cheerio.load(htmlString);
    $('item').slice(0, 3).each(function(i, element) {
      let url = $(this).find('link')[0].next.data.replace(/\s+/g, ' ').trim();
      urls.push(getFeatureImageUrl(url))
      links.push({
        title: $(this).find('title').text(),
        url,
        description: $(this).find('description').text().slice(0, 150) + '...',
      })
    })
    return Promise.all(urls)
    .then(values => {
      values.forEach((image_url, i) => {
        links[i].image_url =image_url;
      })
      return links;
    })
  });
}

bot.on('authentication', (payload, chat) => {
  console.log('authentication')
})

bot.hear(['hello', 'hi', /hey( there)?/i, 'what up', 'yo'], (payload, chat) => {
  const text = payload.message.text;
  chat.say(`${text}!`)
});

bot.hear(['ask a question'], (payload, chat) => {
  const askWhat = (convo) => {
    convo.ask('Sure, what would you like to ask us?', (payload, convo) => {
      const text = payload.message.text;
      convo.set('name', text);
    });
  };
  chat.conversation((convo) => {
    askWhat(convo);
  });
})

bot.hear(['see projects'], (payload, chat) => {
  chat.say('Here are some projects')
})

bot.hear(['read hardware news'], (payload, chat) => {
  console.log('news')
  chat.say('Here are some news:', { typing: true })
  .then(() => {
    chat.sendAction('typing_on')
    getWevolverFeed()
    .then((links) => {
      let elements = [];
      console.log(links)
      links.slice(0,3).forEach(link => {
        elements.push({
          default_action:{
            type:'web_url',
            url: link.url,
          },
          buttons: [
            {
              title: "View",
              type:'web_url',
              url: link.url,  
            }
          ],
          image_url: link.image_url || 'https://www.wevolver.com/static/images/logo/logo_2014_transparent_noText_224.png',
          subtitle: link.description,
          title:link.title
        })
      })
      chat.sendListTemplate(elements);
    })
  })
})

bot.on('message', (payload, chat, data) => {
  console.log(data)
  if(!data.captured) {
    chat.say({
      text: 'I\'m the WevoBot, here to help you on your hardware journey. How can I help?',
      quickReplies: [
        'Ask a question',
        'Read hardware news',
        // 'See projects'
      ]
    })
  }
});

bot.start(process.env.PORT || 3000);