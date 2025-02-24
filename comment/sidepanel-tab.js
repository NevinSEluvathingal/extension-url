document.addEventListener('DOMContentLoaded', async () => {
    const commentsList = document.getElementById('commentsList');

    function renderComments(comments) {
        console.log("hello");
       // commentsList.innerHTML = ''; // Clear existing comments
        comments.forEach(comment => {
            const commentCard = document.createElement('div');
            commentCard.classList.add('container');
            commentCard.innerHTML = `
                <div class="comment_container">
                    <div class="comment_card">
                        <h3 class="comment_title">${comment.user_id}</h3>
                        <p>${comment.comment_content}</p>
                        <div class="comment_footer">
                            <div>Likes: 0</div>
                            <div>Dislikes: 0</div>
                            <div class="show-replies">Replies 0</div>
                        </div>
                    </div>
                </div>
            `;
            commentsList.appendChild(commentCard);
        });
    }

    // Fetch and render comments
    async function fetchComments() {
        try {
            const response = await fetch(`http://localhost:3333/view/newest/comments/:forurl/:start/`);
            if (!response.ok) throw new Error('Failed to fetch comments');
            const comments = await response.json();
            console.log(comments.new_comments);
            renderComments(comments.new_comments);
        } catch (error) {
            console.error('Error fetching comments:', error);
        }
    }

    async function init() {
        // Fetch and display the current tab URL
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs.length > 0) {
                currentTabUrl = tabs[0].url; // Get the URL of the active tab
                console.log('Current Tab URL:', currentTabUrl);
                fetchComments(); // Call fetchComments
            } else {
                console.error('No active tab found');
            }
        });


        // Handle posting a new comment
        document.getElementById('submitComment').addEventListener('click', async () => {
            const messageField = document.getElementById('message');
            const message = messageField.value.trim();

            if (message === '') {
                alert('Please enter a comment');
                return;
            }

            const username = 'User'; // Replace this with actual username logic

            try {
                const response = await fetch('https://your-backend-url.com/comments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, message }),
                });

                if (response.ok) {
                    const newComment = document.createElement('div');
                    newComment.classList.add('container');
                    newComment.innerHTML = `
                        <div class="comment_container">
                            <div class="comment_card">
                                <h3 class="comment_title">${username}</h3>
                                <p>${message}</p>
                                <div class="comment_footer">
                                    <div>Likes: 0</div>
                                    <div>Dislikes: 0</div>
                                    <div class="show-replies">Replies 0</div>
                                </div>
                            </div>
                        </div>
                    `;
                    document.getElementById('commentsList').prepend(newComment); // Add to top
                    messageField.value = ''; // Clear the input field
                } else {
                    console.error('Failed to post comment');
                }
            } catch (error) {
                console.error('Error posting comment:', error);
            }
        });
    }

    init();
});
