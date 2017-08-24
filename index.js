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
  })
  .catch(err => {
    console.log(err)
    return links = [ { title: 'Guide To Fabricating Microstructures With 3D Printing',
        url: 'https://hardwarenews.wevolver.com/guide-fabricating-microstructures-3d-printing/',
        description: '3D printing technologies have come a long way since Chuck Hull invented Stereolithography back in 1986. The first 3D printed object, a small blue eyec...',
        image_url: undefined },
      { title: 'New VR Tool Seeks to Make Product Design “Quicker and More Efficient”',
        url: 'https://hardwarenews.wevolver.com/new-vr-tool-seeks-make-product-design-quicker-efficient/',
        description: 'A new sketching tool for product designers has launched, which aims to “bring ideas to life quicker” through the use of virtual and augmented reality ...',
        image_url: undefined },
      { title: 'Designers Are Forgetting One Major Element Of The Design Process',
        url: 'https://hardwarenews.wevolver.com/designers-forgetting-one-major-element-design-process/',
        description: 'What do you do when your toaster breaks? Chances are, you toss it and buy another one. It’s only a toaster, after all. But what if your toaster was de...',
        image_url: 'https://i0.wp.com/hardwarenews.wevolver.com/wp-content/uploads/2017/08/fairphone-18-980x652.jpg?resize=696%2C463&ssl=1' } ]
  });
}

getWevolverFeed()
.then(links => console.log(links))

bot.on('authentication', (payload, chat) => {
  console.log('authentication')
})

bot.hear(['hello', 'hi', /hey( there)?/i, 'what up', 'yo'], (payload, chat) => {
  const text = payload.message.text;
  chat.say({
      text: `${text}! Hi, I\'m the WevolverBot, here to help you on your hardware journey. How can I help?`,
      quickReplies: [
        'Ask a question..',
        'Read hardware news',
        // 'See projects'
      ]
    })
});

bot.hear(['Ask a question..'], (payload, chat) => {
  const askWhat = (convo) => {
    convo.ask('What would you like to know?', (payload, convo) => {
      const text = payload.message.text;
      convo.say(`Oh, your name is ${text}`).then(() => askWhatSecondTime(convo));
    });
  };
  const askWhatSecondTime = (convo) => {
    convo.ask('What would you like to know', (payload, convo) => {
      const text = payload.message.text;
      if(text.slice(0,2) === 'no' || text.slice(0,2) === 'No') convo.end();
      convo.say(`Thank you for the question. I'll forward it to my colleague Cameron, he'll answer as soon as possible.`).then(() => askWhatSecondTime(convo));
    });
  };
  const askWhatThirdTime = (convo) => {
    convo.ask(`Anything else you would like to ask?`, (payload, convo) => {
      const text = payload.message.text;
      if(text.slice(0,2) === 'no' || text.slice(0,2) === 'No') convo.end();
      convo.say(`Thank you for your questions!`)
      convo.end();
    })
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
  chat.say('Here are the latest news stories:', { typing: true })
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
      text: 'I\'m the WevolverBot, let me know how I can help!',
      quickReplies: [
        'Ask a question..',
        'Read hardware news',
        // 'See projects'
      ]
    })
  }
});

bot.start(process.env.PORT || 3000);
