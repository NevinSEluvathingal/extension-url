document.addEventListener('DOMContentLoaded', async () => {
    let activeTab;
    let hello;
    let pageid;
    let false_tab;
    let user_data;
    let currentPageUrl;
    const acttabarr = [];
    
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        activeTab = tabs[0];
        acttabarr.push(activeTab.id);
        hello = activeTab.url;
        fetchComments(hello);
    });
    
    chrome.tabs.onActivated.addListener((activeInfo) => {
        chrome.tabs.get(activeInfo.tabId, (tab) => {
            if (tab) {
                if (tab.active) {
                    console.log("Tab switched to:", tab.url);
                    if (acttabarr.includes(tab.id)) {
                        fetchComments(tab.url);
                        document.getElementById("container").style.display = "block";
                        document.getElementById("open").style.display = "none";
                    } else {
                        false_tab = tab;
                        document.getElementById("container").style.display = "none";
                        document.getElementById("open").style.display = "block";

                        chrome.sidePanel.setOptions({
                            tabId: tab.id,
                            enabled: false,
                            path: 'sidepanel-tab.html' // Replace with your panel HTML file
                        });
                    }
                }
            }
        });
    });

    const new_butt = document.getElementById("open");
    new_butt.addEventListener('click', openComment);

    function openComment() {
        acttabarr.push(false_tab.id);
        fetchComments(false_tab.url);
        document.getElementById("container").style.display = "block";
        document.getElementById("open").style.display = "none";
    }

    const commentsList = document.getElementById('commentsList');
    const newCommentText = document.getElementById('newCommentText');
    const submitComment = document.getElementById('submitComment');
    const sortCommentsButton = document.getElementById('sortComments');
    const darkModeToggle = document.getElementById('darkModeToggle');

    let comments = [];
    
    function generateRandom8DigitNumber() {
    	return Math.floor(10000000 + Math.random() * 90000000); 
    }


 function renderComments(commentsToRender) {
    commentsList.innerHTML = ''; // Clear existing comments
    commentsToRender.forEach(comment => {
        const commentCard = document.createElement('div');
        commentCard.classList.add('comment_container');
        commentCard.innerHTML = `
            <div class="comment_card">
                <div class="comment_header" style="flex-direction: row;margin-bottom: 0.5rem;justify-content: space-between;">
                    <div class="comment_user" style="display: flex;flex-direction: row;align-items: anchor-center;justify-content: start;">
                        <!-- Profile Picture -->
                        <img class="comment_user_image" src="${comment.profile_pic}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;" alt="${comment.name}'s profile picture" />
                        <h3 style="margin-left:9px;" class="comment_title">${comment.username}</h3>
                    </div>
                    <span class="comment_timestamp">${getTimeDifferenceFromNow(comment.created_at)}</span>
                </div>
                <p class="comment_content">${comment.comment}</p>
                <div class="comment_footer">
                    <div class="comment_actions">
                        <button class="action-button like-button" data-comment-id="${comment.user_id}">
                            <i class="fas fa-thumbs-up"></i> <span class="like-count">0</span>
                        </button>
                        <button class="action-button dislike-button" data-comment-id="${comment.user_id}">
                            <i class="fas fa-thumbs-down"></i> <span class="dislike-count">0</span>
                        </button>
                        <span class="sentiment-score">
                            ${getSentimentEmoji(comment.sentiment_score)} 
                            ${comment.sentiment_score ? comment.sentiment_score.toFixed(2) : 'N/A'}
                        </span>
                    </div>
                    <div class="show-replies" data-comment-id="${comment.user_id}">Replies (0)</div>
                </div>
            </div>
            <div class="nested-comments" id="replies-${comment.user_id}"></div>
            <div class="reply-form">
                <input type="text" class="reply-input" placeholder="Write a reply...">
                <button class="reply-button" data-comment-id="${comment.user_id}">Reply</button>
            </div>
        `;
        commentsList.appendChild(commentCard);
    });
}


        // Add event listeners for likes, dislikes, and replies
        document.querySelectorAll('.like-button, .dislike-button').forEach(button => {
            button.addEventListener('click', handleVote);
        });

        document.querySelectorAll('.reply-button').forEach(button => {
            button.addEventListener('click', handleReply);
        });

        document.querySelectorAll('.show-replies').forEach(button => {
            button.addEventListener('click', showReply);
        });
    

    function showReply(event) {
        const button = event.currentTarget;
        const commentId = button.dataset.commentId;
        const repliesContainer = document.getElementById(`replies-${commentId}`);

        if (repliesContainer.style.display === 'none' || !repliesContainer.style.display) {
            repliesContainer.style.display = 'block';
            fetchReplies(commentId, repliesContainer);
        } else {
            repliesContainer.style.display = 'none';
        }
    }

    async function fetchReplies(commentId, container) {
        try {
            const response = await fetch(`http://localhost:8080/replies/${commentId}`);
            if (!response.ok) throw new Error('Failed to fetch replies');
            const repliesData = await response.json();

            // Render replies
            container.innerHTML = '';
            repliesData.forEach(reply => {
                const replyElement = document.createElement('div');
                replyElement.classList.add('comment_container');
                replyElement.innerHTML = `
                    <div class="comment_card">
                        <div class="comment_header">
                            <h3 class="comment_title">User</h3>
                            <span class="comment_timestamp">Just now</span>
                        </div>
                        <p class="comment_content">${reply.comment_content}</p>
                        <div class="comment_footer">
                            <div class="comment_actions">
                                <span class="sentiment-score">
                                    ${getSentimentEmoji(reply.sentimentScore)} 
                                    ${reply.sentimentScore ? reply.sentimentScore.toFixed(2) : 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>
                `;
                container.appendChild(replyElement);
            });
        } catch (error) {
            console.error('Error fetching replies:', error);
        }
    }

    function getSentimentEmoji(score) {
        if (score === null || score === undefined) return '';
        if (score == 5) return '😍';
        if (score == 4) return '😊';
        if (score == 3) return '🙂';
        if (score == 2) return '😐';
        if (score == 1) return '🙁';
        return '😢';
    }

    function handleVote(event) {
        const button = event.currentTarget;
        const commentId = button.dataset.commentId;
        const isLike = button.classList.contains('like-button');
        const countSpan = button.querySelector('span');
        let count = parseInt(countSpan.textContent);
        count++;
        countSpan.textContent = count;

        // Here you would typically send a request to your backend to update the vote count
        console.log(`${isLike ? 'Liked' : 'Disliked'} comment ${commentId}`);
    }

    async function handleReply(event) {
        const button = event.currentTarget;
        const commentId = button.dataset.commentId;
        const replyInput = button.previousElementSibling;
        const replyText = replyInput.value.trim();

        if (replyText) {
            try {
                const sentimentResponse = await fetch("http://localhost:5000/api/sentiment", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ comment: replyText })
                });

                if (sentimentResponse.ok) {
                    const sentimentData = await sentimentResponse.json();
                    const repliesContainer = document.getElementById(`replies-${commentId}`);
                    const replyElement = document.createElement('div');
                    replyElement.classList.add('comment_container');
                    replyElement.innerHTML = `
                        <div class="comment_card">
                            <div class="comment_header">
                                <h3 class="comment_title">User</h3>
                                <span class="comment_timestamp">Just now</span>
                            </div>
                            <p class="comment_content">${replyText}</p>
                            <div class="comment_footer">
                                <div class="comment_actions">
                                    <span class="sentiment-score">
                                        ${getSentimentEmoji(sentimentData.sentiment_score)} 
                                        ${sentimentData.sentiment_score.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    `;
                    repliesContainer.appendChild(replyElement);
                    replyInput.value = '';

                    // Update reply count
                    const replyCountElement = button.closest('.comment_container').querySelector('.show-replies');
                    const currentCount = parseInt(replyCountElement.textContent.match(/\d+/)[0]);
                    replyCountElement.textContent = `Replies (${currentCount + 1})`;

                    console.log(`Replied to comment ${commentId}: ${replyText}`);
                } else {
                    console.error('Failed to analyze sentiment for reply');
                }
            } catch (error) {
                console.error('Error posting reply:', error);
            }
        }
    }

    // Fetch and render comments
    async function fetchComments(url) {
        try {
            cleaned_url = url.replace("https://", "")
            currentPageUrl = await encodeURIComponent(cleaned_url); 
            console.log(currentPageUrl);

            const response2 = await fetch(`http://localhost:8080/comments?url=${encodeURIComponent(currentPageUrl)}`);
            if (!response2.ok) throw new Error('Failed to fetch comments');
            const commentsData = await response2.json();
            console.log(commentsData);
            renderComments(commentsData);
        } catch (error) {
            console.error('Error fetching comments:', error);
        }
    }
function getTimeDifferenceFromNow(backendTime) {
    // Get the current time in UTC
    const currentTime = new Date();

    // Parse the backend time (which is already in UTC) into a Date object
    const backendDate = new Date(backendTime);

    // Get the difference in milliseconds between current time and backend time
    const diffInMilliseconds = currentTime - backendDate;

    // Convert milliseconds to various units
    const diffInSeconds = Math.floor(diffInMilliseconds / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    // Create a human-readable format
    let result = '';
    if (diffInDays > 0) {
        result = `${diffInDays}d ago`;
    } else if (diffInHours > 0) {
        result = `${diffInHours}hr ago`;
    } else if (diffInMinutes > 0) {
        result = `${diffInMinutes}min ago`;
    } else {
        result = `${diffInSeconds}s ago`;
    }

    return result;
}



    // Handle posting a new comment
    submitComment.addEventListener('click', async () => {
    	chrome.storage.sync.get("userInfo", async (data) => {
        console.log(data.userInfo); 
        user_data=data.userInfo;
        });
        const id=generateRandom8DigitNumber();
        const message = newCommentText.value.trim();
        const commentData = {
            comment: message,
            username: user_data.name,
            user_id: id,
            url: currentPageUrl,
            parent_id: null,
            sentiment_score: 2,
            LikeCount: 0,
            DislikeCount: 0,
            profile_pic: user_data.picture,
            created_at: new Date(),
        };
        console.log(commentData);

        if (message === '') {
            alert('Please enter a comment');
            return;
        }

       /* try {
            const sentimentResponse = await fetch("http://localhost:5000/api/sentiment", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ comment: message })
            });*/

         //   if (sentimentResponse.ok) {
            //    const sentimentData = await sentimentResponse.json();
                comments.unshift(commentData);
                renderComments(comments);

                try {
                    const new_comment = await fetch("http://localhost:8080/comments", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(commentData),
                        mode:'no-cors'
                    });
                    commentData.value = ''; // Clear the input field
                } catch (error) {
                    console.error('Error posting comment:', error);
                }
           // } else {
            //    console.error('Failed to analyze sentiment');
           // }
      //  } catch (error) {
        //    console.error('Error posting comment:', error);
       // }
    });

    // Sort comments
    sortCommentsButton.addEventListener('click', () => {
        comments.reverse();
        renderComments(comments);
    });

    // Toggle dark mode
    darkModeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        darkModeToggle.innerHTML = isDarkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    });

    // Enable/disable submit button based on textarea content
    newCommentText.addEventListener('input', () => {
        submitComment.disabled = newCommentText.value.trim() === '';
    });

    // Initial fetch of comments
    fetchComments();
});

