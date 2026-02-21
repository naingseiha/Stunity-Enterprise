import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Post } from '@/types';
import { PostCard } from '@/components/feed/PostCard'; // Correct import path

interface RenderPostItemProps {
  item: Post;
  handlersRef: React.MutableRefObject<any>;
  isValued: boolean;
  setAnalyticsPostId: (id: string | null) => void;
}

const RenderPostItem = ({ item, handlersRef, isValued, setAnalyticsPostId }: RenderPostItemProps) => {
  const h = handlersRef.current;
  
  return (
    <View style={styles.postWrapper}>
      <PostCard
        post={item}
        onLike={() => h.handleLikePost(item)}
        onComment={() => h.navigation.navigate('Comments', { postId: item.id })}
        onRepost={() => h.handleSharePost(item)}
        onShare={() => h.handleSharePost(item)}
        onBookmark={() => h.bookmarkPost(item.id)}
        onValue={() => h.handleValuePost(item)}
        isValued={isValued}
        onUserPress={() => h.navigation.navigate('UserProfile', { userId: item.author.id })}
        onPress={() => h.handlePostPress(item)}
        onVote={(optionId) => h.handleVoteOnPoll(item.id, optionId)}
        onViewAnalytics={() => setAnalyticsPostId(item.id)}
        navigate={h.navigation.navigate}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  postWrapper: {
    marginBottom: 0,
  },
});

export default memo(RenderPostItem, (prev, next) => {
  return (
    prev.item === next.item && 
    prev.isValued === next.isValued
    // handlersRef and setAnalyticsPostId are stable
  );
});
