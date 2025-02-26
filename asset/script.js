// This was built using aat.js: https://github.com/TahaSh/aat

const { ScrollObserver, valueAtPercentage } = aat

const cardsContainer = document.querySelector('.cards')
const cards = document.querySelectorAll('.card')
cardsContainer.style.setProperty('--cards-count', cards.length)
cardsContainer.style.setProperty(
  '--card-height',
  `${cards[0].clientHeight}px`
)

// Modified to ensure cards are visible without scrolling
Array.from(cards).forEach((card, index) => {
  // Remove the offsetTop that was pushing cards down
  // const offsetTop = 20 + index * 20
  const offsetTop = 0;
  card.style.paddingTop = `${offsetTop}px`
  
  if (index === cards.length - 1) {
    return
  }
  
  // Set initial scale to 1 instead of calculating a reduced scale
  const toScale = 1;
  const nextCard = cards[index + 1]
  const cardInner = card.querySelector('.card__inner')
  
  // Make sure cards are initially visible at full scale
  cardInner.style.scale = '1';
  cardInner.style.filter = 'brightness(1)';
  
  // Only apply scroll effects after user has started scrolling
  ScrollObserver.Element(nextCard, {
    offsetTop,
    offsetBottom: window.innerHeight - card.clientHeight
  }).onScroll(({ percentageY }) => {
    // Only apply scale effect if user has scrolled
    if (percentageY > 0) {
      cardInner.style.scale = valueAtPercentage({
        from: 1,
        to: toScale,
        percentage: percentageY
      })
      cardInner.style.filter = `brightness(${valueAtPercentage({
        from: 1,
        to: 0.6,
        percentage: percentageY
      })})`
    }
  })
})