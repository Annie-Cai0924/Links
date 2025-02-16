// This allows us to process/render the descriptions, which are in Markdown!
// More about Markdown: https://en.wikipedia.org/wiki/Markdown
let markdownIt = document.createElement('script')
markdownIt.src = 'https://cdn.jsdelivr.net/npm/markdown-it@14.0.0/dist/markdown-it.min.js'
document.head.appendChild(markdownIt)

// Okay, Are.na stuff!
let channelSlug = 'the-art-and-function-of-maps' // The “slug” is just the end of the URL

// First, let’s lay out some *functions*, starting with our basic metadata:
let placeChannelInfo = (data) => {
	// Target some elements in your HTML:
	let channelTitle = document.querySelector('#channel-title')
	let channelDescription = document.querySelector('#channel-description')
	let channelCount = document.querySelector('#channel-count')
	let channelLink = document.querySelector('#channel-link')

	// Then set their content/attributes to our data:
	channelTitle.innerHTML = data.title
	channelDescription.innerHTML = window.markdownit().render(data.metadata.description) // Converts Markdown → HTML
	channelCount.innerHTML = data.length
	channelLink.href = `https://www.are.na/channel/${channelSlug}`
}


// Function to ensure category container exists
function ensureCategoryContainer(categoryId) {
    let container = document.querySelector(`#${categoryId}`);
    if (!container) {
        container = document.createElement('ul');
        container.id = categoryId;
        container.classList.add('block-category');
        document.querySelector('#channel-blocks').appendChild(container);
    }
    return container;
}


// Then our big function for specific-block-type rendering:
let renderBlock = (block) => {
	// To start, a shared `ul` where we’ll insert all our blocks
	let channelBlocks = document.querySelector('#channel-blocks')





let categoryId;
let blockItem = '';

	// ======================= Links! ======================
if (block.class === 'Link') {
    categoryId = 'links';
    blockItem = `
        <li class="block-item image-block">
 				<img src="${ block.image.original.url }" alt="${ block.title }">
             <div class="overlay">
                 <p>${block.title}</p>
 			<p>${block.description}</p>
             </div>
            <p><a href="${ block.source.url }">See the original ↗</a></p>
         </li>`;





         
// ======================= Images! ======================
} else if (block.class === 'Image') {
    categoryId = 'images';
    blockItem = `
        <li class="block-item image-block">
 				<img src="${ block.image.original.url }" alt="${ block.title }">
                 <div class="overlay">
                <p>${block.title}</p>
 			<p>${block.description}</p>
                  </div>
 			</li>`;





// ======================= PDFs! ======================
} else if (block.attachment && block.attachment.content_type.includes('pdf')) {
    categoryId = 'pdfs';
    blockItem = `
        <li>
 				<embed src="${ block.attachment.url }" type="application/pdf" width="600" height="400">
 				<p><a href="${ block.attachment.url }" target="_blank">Download PDF →</a></p>
 			</li>`;




// ======================= Audios! ======================
} else if (block.embed && block.embed.type.includes('rich')) {
    categoryId = 'audios';
    blockItem = ` <li>
 			${ block.embed.html } </li>`;




  // ======================= Texts! ======================
} else if (block.class == 'Text') {
    categoryId = 'text'
    blockItem = `<li>
    				<blockquote>${ block.content }</blockquote>
     			</li>`
}

if (categoryId) {
    let container = ensureCategoryContainer(categoryId);
    container.insertAdjacentHTML('beforeend', blockItem);
}
}
function toggleCell(row, col) {
	let cell = cells[row][col]; //create cell
	let currentColor = cell.style.backgroundColor; //create current color 

	if (currentColor === "black") {
	  cell.style.backgroundColor = "white";
	} else if (currentColor === "white") {
	  cell.style.backgroundColor = "black";
	}
  
	count[row][col]++; // increase toggle count by 1;
  
	// if count is more than the threshold set earlier, become transparent
	if (count[row][col] >= threshold) {
	  cell.style.backgroundColor = "transparent";
	}
	console.log("togglecell worked")
  }









// It‘s always good to credit your work:
let renderUser = (user, container) => { // You can have multiple arguments for a function!
	let userAddress =
		`
		<address>
			<img src="${ user.avatar_image.display }">
			<h3>${ user.first_name }</h3>
			<p><a href="https://are.na/${ user.slug }">Are.na profile ↗</a></p>
		</address>
		`
	container.insertAdjacentHTML('beforeend', userAddress)
}



// Now that we have said what we can do, go get the data:
fetch(`https://api.are.na/v2/channels/${channelSlug}?per=100`, { cache: 'no-store' })
	.then((response) => response.json()) // Return it as JSON data
	.then((data) => { // Do stuff with the data
		console.log(data) // Always good to check your response!
		placeChannelInfo(data) // Pass the data to the first function

		// Loop through the `contents` array (list), backwards. Are.na returns them in reverse!
		data.contents.reverse().forEach((block) => {
			// console.log(block) // The data for a single block
			renderBlock(block) // Pass the single block data to the render function
		})

		// Also display the owner and collaborators:
		let channelUsers = document.querySelector('#channel-users') // Show them together
		data.collaborators.forEach((collaborator) => renderUser(collaborator, channelUsers))
		renderUser(data.user, channelUsers)
	})

document.querySelectorAll(".navbar a").forEach(link => {
    link.addEventListener("click", function(event) {
        event.preventDefault(); // 阻止默认跳转
        let targetId = this.getAttribute("href");
        let targetElement = document.querySelector(targetId);
        if (targetElement) {
            targetElement.scrollIntoView({ behavior: "smooth" });
        }
    });
});