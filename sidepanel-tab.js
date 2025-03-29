document.addEventListener('DOMContentLoaded', async () => {
    let activeTab;
    let hello;
    let id;
    let comment_id;
    let false_tab;
    let user_data;
    let cleaned_url;
    // Track connected users for the current user
    let userConnections = [];
    
 async function summary(url) {
        try {
            const summaryResponse = await fetch(`https://nevinsaji.com/go/comment_summary?url=${encodeURIComponent(url)}`);
            if (!summaryResponse.ok) throw new Error('Failed to fetch summary');

            const summaryData = await summaryResponse.json();
            document.getElementById("summaryText").textContent = summaryData.summary || "No summary available.";
            console.log(summaryData);
        } catch (error) {
            console.error('Error fetching summary:', error);
            document.getElementById("summaryText").textContent = "Failed to load summary.";
        }
    }
     
     
                     
    chrome.storage.sync.get("userInfo", async (data) => {
        console.log(data.userInfo); 
        user_data = data.userInfo;
        document.querySelector(".user-avatar").src = user_data.picture;
        await login();  // Wait for login to complete before proceeding
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            activeTab = tabs[0];
            hello = activeTab.url;
            clean_url = hello.replace("https://", "");
            summary(clean_url)
            fetchComments(hello);  // Now fetch comments after login completes
        });
    });
    
    const acttabarr = [];
    
    async function login() {
        try {
            const value = user_data.name;
            const response = await fetch(`https://nevinsaji.com/go/login/${value}`);
            if (!response.ok) throw new Error('Failed to fetch replies');
            const repliesData = await response.json();
            console.log(repliesData.user_id);
            id = repliesData.user_id;
        } catch (error) {
            console.error('Error posting comment:', error);
        }
    }
    
    chrome.tabs.onActivated.addListener((activeInfo) => {
        chrome.tabs.get(activeInfo.tabId, (tab) => {
            if (tab) {
                if (tab.active) {
                    console.log("Tab switched to:", tab.url);
                    cleanod_url = (tab.url).replace("https://", "");
                    summary(cleanod_url);
                    if (acttabarr.includes(tab.id)) {
                        fetchComments(tab.url); 
                        document.getElementById("container").style.display = "block";
                        document.getElementById("open").style.display = "none";
                    } else {
                        false_tab = tab;
                        document.getElementById("container").style.display = "none";
                        document.getElementById("open").style.display = "block";
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
      //  cleany_url = (false_tab.url).replace("https://", "");
     //   summary(cleany_url);
        document.getElementById("container").style.display = "block";
        document.getElementById("open").style.display = "none";
    }

    const commentsList = document.getElementById('commentsList');
    const newCommentText = document.getElementById('newCommentText');
    const submitComment = document.getElementById('submitComment');
    const sortCommentsButton = document.getElementById('sortComments');
    const darkModeToggle = document.getElementById('darkModeToggle');
    
    // Add a new button for sorting by connections
    const sortByTypeDropdown = document.createElement('select');
    sortByTypeDropdown.id = 'sortByType';
    sortByTypeDropdown.innerHTML = `
        <option value="newest">Newest</option>
        <option value="oldest">Oldest</option>
        <option value="connections">Show Connections First</option>
    `;
    
    // Insert dropdown after the sort button
    sortCommentsButton.parentNode.insertBefore(sortByTypeDropdown, sortCommentsButton.nextSibling);
    
    // Update sorting to use the dropdown
    sortCommentsButton.textContent = "Sort";
    
    let comments = [];
    
    function renderComments(commentsToRender) {
        commentsList.innerHTML = ''; // Clear existing comments
        commentsToRender.forEach(comment => {
            const replyCount = comment.reply_count !== undefined ? comment.reply_count : 0;
            
            const commentCard = document.createElement('div');
            commentCard.classList.add('comment_container');
            
            // Add a special class if this is from a connected user
            if (comment.con_status) {
                commentCard.classList.add('connected');
            }
            
            commentCard.innerHTML = `
                <div class="comment_card">
                    <div class="comment_header" style="flex-direction: row;margin-bottom: 0.5rem;justify-content: space-between;">
                        <div class="comment_user" style="display: flex;flex-direction: row;align-items: anchor-center;justify-content: start;">
                            <img class="comment_user_image" src="${comment.profile_pic}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;" alt="${comment.name}'s profile picture" />
                            <h3 style="margin-left:9px;" class="comment_title">${comment.username}</h3>
                            ${comment.con_status ? '<span class="connection-badge" style="margin-left: 5px; background-color: #4CAF50; color: white; padding: 2px 6px; border-radius: 10px; font-size: 0.8em;">Connected</span>' : ''}
                        </div>
                        <span class="comment_timestamp">${getTimeDifferenceFromNow(comment.created_at)}</span>
                    </div>
                    <p class="comment_content">${comment.comment}</p>
                    <div class="comment_footer">
                        <div class="comment_actions">
                            <button class="action-button like-button" data-comment-id="${comment.id}" style="color: ${comment.like_status ? 'blue' : 'inherit'};">
                                <i class="fas fa-thumbs-up"></i> <span class="like-count">${comment.like_count || 0}</span>
                            </button>
			   <button class="action-button dislike-button" 
    				data-comment-id="${comment.id}" 
    				style="color: ${comment.like_status === null || comment.like_status ? 'inherit' : 'red'};">
    				<i class="fas fa-thumbs-down"></i> <span class="dislike-count">${comment.dislike_count || 0}</span>
			   </button>

 			    <button class="action-button connect-button ${comment.con_status ? 'connected' : ''}" 
    				data-user-id="${comment.user_id}"  data-comment-id="${comment.id}" data-username="${comment.username}">
    			    <i class="fas fa-user-plus"></i> ${comment.con_status ? 'Connected' : 'Connect'}
			    </button>

                            <span class="sentiment-score">
                                ${getSentimentEmoji(comment.sentiment_score)} 
                                ${comment.sentiment_score ? comment.sentiment_score.toFixed(2) : 'N/A'}
                            </span>
                        </div>
                        <div class="show-replies" data-comment-id="${comment.id}">Replies (${replyCount})</div>
                    </div>
                    <div class="nested-comments" id="replies-${comment.id}"></div>
                    <div class="reply-form">
                        <input type="text" class="reply-input" placeholder="Write a reply..." style="display:none;">
                        <button class="reply-button" data-comment-id="${comment.id}" style="display:none;">Submit</button>
                        <button class="cancel-button" data-comment-id="${comment.id}" style="display:none;">Cancel</button>
                        <button class="reply">Reply</button>
                    </div>
                </div>
            `;
            commentsList.appendChild(commentCard);
        });
        
        document.querySelectorAll('.like-button, .dislike-button').forEach(button => {
            console.log("clicked");
            button.addEventListener('click', handleVote);
        });

        document.querySelectorAll('.reply-button').forEach(button => {
            console.log("clicked");
            button.addEventListener('click', handleReply);
        });

        document.querySelectorAll('.show-replies').forEach(button => {
            console.log("clicked");
            button.addEventListener('click', showReply);
        });
        
        document.querySelectorAll('.connect-button').forEach(button => {
            button.addEventListener('click', handleConnect);
        });
        
        document.querySelectorAll('.reply').forEach(button => {
            button.addEventListener('click', () => {
                // Get the parent .reply-form element of the clicked .reply button
                const replyForm = button.closest('.reply-form');
                // Toggle the display of the .reply-input and .reply-button
                const replyInput = replyForm.querySelector('.reply-input');
                const replyButton = replyForm.querySelector('.reply-button');
                const cancelButton = replyForm.querySelector('.cancel-button');
                
                // Toggle the display between 'none' and 'block'
        //        const currentDisplay = replyInput.style.display;
      //          if (currentDisplay === 'none' || currentDisplay === '') {
                    replyInput.style.display = 'block';
                    replyButton.style.display = 'block';
                    cancelButton.style.display='block';
                    button.style.display='none';
//                } else {
  //                  replyInput.style.display = 'none';
    //                replyButton.style.display = 'none';
                
            });
        });
        
         document.querySelectorAll('.cancel-button').forEach(button => {
         	button.addEventListener('click', () => {
         		                const replyForm = button.closest('.reply-form');
                
                			const replyInput = replyForm.querySelector('.reply-input');
                			const replyButton = replyForm.querySelector('.reply-button');
                			const reply = replyForm.querySelector('.reply');
                			
                                        replyInput.style.display = 'none';
    			                replyButton.style.display = 'none';
    			                reply.style.display='block';
    			                button.style.display='none';
    		});
                			
         });
    }
    
    sortByTypeDropdown.addEventListener('click',()=>{
    	if (sortByTypeDropdown.value==='connections'){
    		sortComment(cleaned_url,id)
    	}
    });
    
    sortByTypeDropdown.addEventListener('click',()=>{
    	if (sortByTypeDropdown.value==='newest'){
    		sortCommentnew(cleaned_url,id)
    	}
    });
    
        sortByTypeDropdown.addEventListener('click',()=>{
    	if (sortByTypeDropdown.value==='oldest'){
    		sortCommentold(cleaned_url,id)
    	}
    });
    
    
    async function sortCommentnew(url, userId) {
	fetchCommentsnew(url);
    }
    
        async function sortCommentold(url, userId) {
	fetchComments(url);
    }
    
    async function sortComment(url, userId) {
    try {
        // Construct the request URL with query parameters
        const apiUrl = `https://nevinsaji.com/go/comments_by_connections?url=${encodeURIComponent(url)}&user_id=${encodeURIComponent(userId)}`;
        
        // Make a GET request to fetch comments
        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error(`Error fetching comments: ${response.statusText}`);
        }

        // Parse JSON response
        const comments = await response.json();
        console.log(comments);

        // Render comments in the UI
        renderComments(comments);
    } catch (error) {
        console.error("Failed to fetch and render comments:", error);
    }
}
    
async function handleConnect(event) {
    const button = event.currentTarget;
    const targetUserId = button.dataset.userId;
    const commentId = button.dataset.commentId;
    const targetUsername = button.dataset.username;
    
    console.log(targetUserId);
    console.log(id);

    if (targetUserId === id.toString()) {
        alert("You cannot connect to yourself");
        return;
    }

    const isConnected = button.classList.contains('connected'); // Check if already connected
    const url = isConnected ? 'https://nevinsaji.com/go/disconnect_users' : 'https://nevinsaji.com/go/connect_users';
    const method = isConnected ? 'DELETE' : 'POST';
    
    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id_1: id,
                user_id_2: parseInt(targetUserId),
                com_id: parseInt(commentId),
            }),
        });

        if (!response.ok) {
            throw new Error(isConnected ? 'Failed to disconnect' : 'Failed to establish connection');
        }

        if (isConnected) {

            // Update button appearance to "Connect"
            button.innerHTML = '<i class="fas fa-user-plus"></i> Connect';
            button.classList.remove('connected');
            button.disabled = false;
            
            // Remove connection badge from all comments by this user
            document.querySelectorAll(`.connect-button[data-user-id="${targetUserId}"]`).forEach(btn => {
                btn.innerHTML = '<i class="fas fa-user-plus"></i> Connect';
                btn.classList.remove('connected');
                btn.disabled = false;

                const userHeader = btn.closest('.comment_card').querySelector('.comment_user');
                const badge = userHeader.querySelector('.connection-badge');
                if (badge) badge.remove();
            });

            console.log(`Disconnected from user ${targetUsername} (ID: ${targetUserId})`);
        } else {

            // Update button appearance to "Connected"
            button.innerHTML = '<i class="fas fa-user-check"></i> Connected';
            button.classList.add('connected');
         

            // Add connection badge to all comments from this user
            document.querySelectorAll(`.connect-button[data-user-id="${targetUserId}"]`).forEach(btn => {
                btn.innerHTML = '<i class="fas fa-user-check"></i> Connected';
                btn.classList.add('connected');
              

                // Add connection badge to the user's name
                const userHeader = btn.closest('.comment_card').querySelector('.comment_user');
                if (!userHeader.querySelector('.connection-badge')) {
                    const badge = document.createElement('span');
                    badge.classList.add('connection-badge');
                    badge.style.marginLeft = '5px';
                    badge.style.backgroundColor = '#4CAF50';
                    badge.style.color = 'white';
                    badge.style.padding = '2px 6px';
                    badge.style.borderRadius = '10px';
                    badge.style.fontSize = '0.8em';
                    badge.textContent = 'Connected';
                    userHeader.appendChild(badge);
                }
            });

            console.log(`Connected with user ${targetUsername} (ID: ${targetUserId})`);
        }

        // Refresh comments if sorted by connections
        if (sortByTypeDropdown.value === 'connections') {
            sortComments();
        }

    } catch (error) {
        console.error(`Error ${isConnected ? 'disconnecting' : 'connecting'} with user:`, error);
        alert(`Failed to ${isConnected ? 'disconnect' : 'connect'}. Please try again.`);
    }
}

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
            console.log(commentId);
            const response = await fetch(`https://nevinsaji.com/go/replie/${commentId}`);
            if (!response.ok) throw new Error('Failed to fetch replies');
            
            const repliesData = await response.json();
            console.log(repliesData);

            // Render replies
            container.innerHTML = '';
            
            repliesData.forEach(reply => {
                const isConnected = userConnections.includes(reply.user_id);
                const replyElement = document.createElement('div');
                replyElement.classList.add('comment_container');
                
                // Add a special class if this is from a connected user
                if (isConnected) {
                    replyElement.classList.add('connected-user-comment');
                }
                
                // Correctly reference properties of `reply`
                replyElement.innerHTML = `
                    <div class="comment_card">
                        <div class="comment_header">
                            <div class="comment_user" style="display: flex;flex-direction: row;align-items: center;">
                                <h3 class="comment_title">${reply.username}</h3>
                                ${isConnected ? '<span class="connection-badge" style="margin-left: 5px; background-color: #4CAF50; color: white; padding: 2px 6px; border-radius: 10px; font-size: 0.8em;">Connected</span>' : ''}
                            </div>
                            <span class="comment_timestamp">${getTimeDifferenceFromNow(reply.created_at)}</span>
                        </div>
                        <p class="comment_content">${reply.comment}</p>
                        <div class="comment_footer">
                            <div class="comment_actions">
                                <button class="action-button connect-button" data-user-id="${reply.user_id}" data-username="${reply.username}" ${isConnected ? 'disabled' : ''}>
                                    <i class="fas fa-user-plus"></i> ${isConnected ? 'Connected' : 'Connect'}
                                </button>
                                <span class="sentiment-score">
                                    ${getSentimentEmoji(reply.sentiment_score)} 
                                    ${reply.sentiment_score ? reply.sentiment_score.toFixed(2) : 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>
                `;
                container.appendChild(replyElement);
            });
            
            // Add event listeners to connect buttons in replies
            container.querySelectorAll('.connect-button').forEach(button => {
                button.addEventListener('click', handleConnect);
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

async function handleVote(event) {
    const button = event.currentTarget;
    const commentId = button.dataset.commentId;
    const isLike = button.classList.contains('like-button');
    console.log(commentId);

    const likeButton = document.querySelector(`.like-button[data-comment-id="${commentId}"]`);
    const dislikeButton = document.querySelector(`.dislike-button[data-comment-id="${commentId}"]`);
    const likeCountSpan = likeButton.querySelector('.like-count');
    const dislikeCountSpan = dislikeButton.querySelector('.dislike-count');

    let likeCount = parseInt(likeCountSpan.textContent);
    let dislikeCount = parseInt(dislikeCountSpan.textContent);

    try {
        const response = await fetch(`https://nevinsaji.com/go/comment_like`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                is_like: Boolean(isLike),
                user_id: Number(id), // Replace with actual user ID
                comment_id: Number(commentId),
            }),
        });
        console.log(isLike)

        if (!response.ok) {
            throw new Error('Failed to update vote count');
        }

        const data = await response.json();
        switch (data.status) {
            case "1": // First time like/dislike
                if (isLike) {
                    likeCount++;
                    likeCountSpan.textContent = likeCount;
                    likeButton.style.color = "blue";
                } else {
                    dislikeCount++;
                    dislikeCountSpan.textContent = dislikeCount;
                    dislikeButton.style.color = "red";
                }
                break;
            case "2": // Already liked and trying to like again (No action)
            	    likeCount--;
                    likeCountSpan.textContent = likeCount;
                    likeButton.style.color = "";
                 break;
            case "3": // Already disliked and trying to dislike again (No action)
            	    dislikeCount--;
                    dislikeCountSpan.textContent = dislikeCount;
                    dislikeButton.style.color = "";
                break;
            case "4": // User liked before and now dislikes (Remove like, add dislike)
                likeCount--;
                dislikeCount++;
                likeCountSpan.textContent = likeCount;
                dislikeCountSpan.textContent = dislikeCount;
                likeButton.style.color = "";
                dislikeButton.style.color = "red";
                break;
            case "5": // User disliked before and now likes (Remove dislike, add like)
                dislikeCount--;
                likeCount++;
                dislikeCountSpan.textContent = dislikeCount;
                likeCountSpan.textContent = likeCount;
                likeButton.style.color = "blue";
                dislikeButton.style.color = "";
                break;
        }

        console.log(`Vote updated: ${data.status}`);
    } catch (error) {
        console.error('Error sending vote to backend:', error);
    }
}


async function handleReply(event) {
    const button = event.currentTarget;
    const replyInput = button.previousElementSibling;
    const replyButton = button.nextElementSibling;
    const replyText = replyInput.value.trim();
    
    if (replyText === '') {
            alert('Please enter a comment');
            return;
    }
    
    // Get the comment ID from the button's parent (assumes show-replies has the correct id format)
    const repliesContainer = button.closest('.comment_card').querySelector('.nested-comments');
    const commentID = repliesContainer.id.split('-')[1];  // Split the ID and get the actual comment ID

    console.log('Replying to comment:', commentID);

    // Prepare the comment data for the reply
    const comment = {
        comment: replyText,
        username: user_data.name,
        id: id,
        url: cleaned_url,
        parent_id: parseInt(commentID),  // Parent comment ID to link this reply
        sentiment_score: 2,
        LikeCount: 0,
        DislikeCount: 0,
        profile_pic: user_data.picture,
        created_at: new Date()
    };

    console.log(`Replying with comment data:`);
    console.log(comment);
    
    try {
            const response4 = await fetch(`https://nevinsaji.com/go/analyze_sentiment?message=${replyText}`);
        
        if (!response4.ok) throw new Error("Failed to fetch comments");

        const commentsData = await response4.json();  // Parse JSON response
        comment.sentiment_score=commentsData.sentiment_score;
    }catch (error) {
            console.error('Error getting sentiment score', error);
    }
     	    

    try {
        // Send the reply to the backend
        const newComment = await fetch(`https://nevinsaji.com/go/replies/${commentID}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(comment),
        });

        const repliesContainer = document.getElementById(`replies-${commentID}`);
        const replyElement = document.createElement('div');
        replyElement.classList.add('comment_container');
        replyElement.innerHTML = `
            <div class="comment_card">
                <div class="comment_header">
                    <h3 class="comment_title">${comment.username}</h3>
                    <span class="comment_timestamp">${getTimeDifferenceFromNow(comment.created_at)}</span>
                </div>
                <p class="comment_content">${replyText}</p>
                <div class="comment_footer">
                    <div class="comment_actions">
                        <span class="sentiment-score">
                            ${comment.sentiment_score}  <!-- Sentiment score can be added here -->
                        </span>
                    </div>
                </div>
            </div>
        `;
        repliesContainer.appendChild(replyElement);
        replyInput.value = '';

        // Fix: Define parentComment to update the reply count
        const parentComment = button.closest('.comment_card');
        const replyCountElement = parentComment.querySelector('.show-replies');
        const currentCount = parseInt(replyCountElement.textContent.match(/\d+/)[0]);
        replyCountElement.textContent = `Replies (${currentCount + 1})`;

        console.log(`Replied to comment ${commentID}: ${replyText}`);
    } catch (error) {
        console.error('Error posting reply:', error);
    }

    // Hide the reply input after submitting
    button.style.display = 'none';
    replyInput.style.display = 'none';
    replyButton.style.display = 'block';
}



async function fetchComments(url) {
    try {
    
        cleaned_url = url.replace("https://", "");
        currentPageUrl = encodeURIComponent(cleaned_url);
        console.log(currentPageUrl);

        login();

        const response2 = await fetch(`https://nevinsaji.com/go/comments?url=${currentPageUrl}&user_id=${id}`);
        
        if (!response2.ok) throw new Error("Failed to fetch comments");

        const commentsData = await response2.json();  // Parse JSON response
        console.log("Fetched comments:", commentsData);

        // Check if commentsData is null, undefined, or not an array
        if (!commentsData || !Array.isArray(commentsData)) {
		console.log("no comments")
		comments=[]
        }
        else
                comments = [...commentsData];
                
        renderComments(comments); // Render the comments
    } catch (error) {
        console.error("Error fetching comments:", error);
    }
}

async function fetchCommentsnew(url) {
    try {
    
        cleaned_url = url.replace("https://", "");
        currentPageUrl = encodeURIComponent(cleaned_url);
        console.log(currentPageUrl);

        login();

        const response2 = await fetch(`https://nevinsaji.com/go/commentsnew?url=${currentPageUrl}&user_id=${id}`);
        
        if (!response2.ok) throw new Error("Failed to fetch comments");

        const commentsData = await response2.json();  // Parse JSON response
        console.log("Fetched comments:", commentsData);

        // Check if commentsData is null, undefined, or not an array
        if (!commentsData || !Array.isArray(commentsData)) {
		console.log("no comments")
		comments=[]
        }
        else
                comments = [...commentsData];
                
        renderComments(comments); // Render the comments
    } catch (error) {
        console.error("Error fetching comments:", error);
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
       
        const message = newCommentText.value.trim();
        newCommentText.value="";
        const commentData = {
            comment: message,
            username: user_data.name,
            user_id: id,
            url: cleaned_url,
            parent_id: null,
            sentiment_score: 2,
            LikeCount: 0,
            DislikeCount: 0,
            profile_pic: user_data.picture,
            created_at: new Date(),
            id:0,		//comment id
        };
        console.log(commentData);

        if (message === '') {
            alert('Please enter a comment');
            return;
        }

        try {
        const response3 = await fetch(`https://nevinsaji.com/go/analyze_sentiment?message=${encodeURIComponent(message)}`);
        
        if (!response3.ok) throw new Error("Failed to fetch comments");

        const commentscore = await response3.json();  // Parse JSON response
        console.log("Fetched score:", commentscore.sentiment_score);
        commentData.sentiment_score=commentscore.sentiment_score;
                try {
                    const new_comment = await fetch("https://nevinsaji.com/go/comments", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(commentData),
                    });
                    const comment_obj=await new_comment.json();
                    comment_id=comment_obj.comment_id;
                    commentData.id=comment_id;
                    comments.unshift(commentData);
                    console.log("comments after posting",comments)
                    renderComments(comments);
                    console.log(commentData);
                    commentData.value = ''; // Clear the input field
                } catch (error) {
                    console.error('Error posting comment:', error);
                }
       } catch (error) {
            console.error('Error posting comment:', error);
        }
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

