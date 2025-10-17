import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Modal, Dimensions, Alert } from 'react-native';
import { ChatMessage } from '../lib/services/chatService';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

interface FileMessageProps {
  message: ChatMessage;
  isFromUser: boolean;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export function FileMessage({ message, isFromUser }: FileMessageProps) {
  const { fileData, text } = message;
  const [showImageModal, setShowImageModal] = useState(false);
  
  if (!fileData) return null;

  const getFileIcon = (fileType: string) => {
    // Since we only allow images, always return the pic.png icon
    return 'pic';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFilePress = () => {
    // Open image modal when pic.png is clicked
    setShowImageModal(true);
  };

  const handleDownload = async () => {
    try {
      // Request media library permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to save images to your device.');
        return;
      }

      // Create a filename with timestamp to avoid conflicts
      const timestamp = new Date().getTime();
      const fileExtension = fileData.fileName.split('.').pop() || 'jpg';
      const fileName = `image_${timestamp}.${fileExtension}`;
      const cachePath = FileSystem.cacheDirectory + fileName;

      let finalUri = cachePath;

      // Handle different file sources
      if (fileData.base64Data) {
        // Handle base64 data (from shared messages)
        try {
          await FileSystem.writeAsStringAsync(cachePath, fileData.base64Data, {
            encoding: FileSystem.EncodingType.Base64,
          });
        } catch (error) {
          console.log('Error writing base64 data:', error);
          Alert.alert('Error', 'Failed to process image data');
          return;
        }
      } else if (fileData.localUri) {
        // Handle local file (from DocumentPicker)
        try {
          // Check if the local file exists
          const fileInfo = await FileSystem.getInfoAsync(fileData.localUri);
          if (!fileInfo.exists) {
            Alert.alert('Error', 'Image file not found. The file may have been moved or deleted.');
            return;
          }

          // Copy the local file to cache directory
          await FileSystem.copyAsync({
            from: fileData.localUri,
            to: cachePath
          });
        } catch (error) {
          console.log('Error copying local file:', error);
          Alert.alert('Error', 'Failed to access image file');
          return;
        }
      } else if (fileData.fileUrl) {
        // Handle URL download
        try {
          const downloadResult = await FileSystem.downloadAsync(
            fileData.fileUrl,
            cachePath
          );
          finalUri = downloadResult.uri;
        } catch (error) {
          console.log('Error downloading from URL:', error);
          Alert.alert('Error', 'Failed to download image from server');
          return;
        }
      } else {
        Alert.alert('Error', 'Image not available for download');
        return;
      }

      // Save to media library
      await MediaLibrary.saveToLibraryAsync(finalUri);
      
      Alert.alert('Success', 'Image saved to your device!');
    } catch (error) {
      console.log('Download error:', error);
      Alert.alert('Error', 'Failed to download image');
    }
  };

  return (
    <View style={[
      styles.fileContainer,
      isFromUser ? styles.userFile : styles.contactFile
    ]}>
      {/* Text message if present */}
      {text && (
        <View style={styles.textContainer}>
          <Text style={[
            styles.messageText,
            isFromUser ? styles.userMessageText : styles.contactMessageText
          ]}>
            {text}
          </Text>
        </View>
      )}
      
      {/* File attachment */}
      <TouchableOpacity 
        style={[
          styles.fileAttachment,
          isFromUser ? styles.userFileAttachment : styles.contactFileAttachment
        ]}
        onPress={handleFilePress}
      >
        <View style={[
          styles.fileIconContainer,
          isFromUser ? styles.userFileIconContainer : styles.contactFileIconContainer
        ]}>
          <Image 
            source={require('../../assets/icons/pic.png')} 
            style={styles.fileIcon} 
            resizeMode="contain"
          />
        </View>
        
        <View style={styles.fileInfo}>
          <Text style={[
            styles.fileName,
            isFromUser ? styles.userFileName : styles.contactFileName
          ]} numberOfLines={1}>
            {fileData.fileName}
          </Text>
          <Text style={[
            styles.fileSize,
            isFromUser ? styles.userFileSize : styles.contactFileSize
          ]}>
            {formatFileSize(fileData.fileSize)}
          </Text>
        </View>
        
        <TouchableOpacity 
          style={[
            styles.downloadIcon,
            isFromUser ? styles.userDownloadIcon : styles.contactDownloadIcon
          ]}
          onPress={handleDownload}
        >
          <Image 
            source={require('../../assets/icons/downlaod.png')} 
            style={styles.downloadIconImage} 
            resizeMode="contain"
          />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Full Screen Image Modal */}
      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalCloseButton}
            onPress={() => setShowImageModal(false)}
          >
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>
          
          <View style={styles.modalImageContainer}>
            <Image
              source={{ 
                uri: fileData.base64Data 
                  ? `data:${fileData.mimeType || 'image/jpeg'};base64,${fileData.base64Data}`
                  : fileData.localUri || fileData.fileUrl 
              }}
              style={styles.modalImage}
              resizeMode="contain"
              onError={(error) => {
                console.log('Image load error:', error);
                Alert.alert('Error', 'Failed to load image');
                setShowImageModal(false);
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  fileContainer: {
    flexDirection: 'column',
    maxWidth: '80%',
    marginVertical: 2,
  },
  userFile: {
    alignSelf: 'flex-end',
  },
  contactFile: {
    alignSelf: 'flex-start',
  },
  textContainer: {
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
    color: 'white',
  },
  userMessageText: {
    color: 'white',
  },
  contactMessageText: {
    color: 'white',
  },
  fileAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 8,
    borderRadius: 12,
    minHeight: 9,
  },
  userFileAttachment: {
    backgroundColor: '#4CAF50',
    borderWidth: 1,
    borderColor: '#45A049',
  },
  contactFileAttachment: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  fileIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userFileIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  contactFileIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  fileIcon: {
    width: 20,
    height: 20,
  },
  fileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  userFileName: {
    color: 'white',
  },
  contactFileName: {
    color: 'white',
  },
  fileSize: {
    fontSize: 12,
    opacity: 0.8,
  },
  userFileSize: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  contactFileSize: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  downloadIcon: {
    width:40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  userDownloadIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  contactDownloadIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  downloadIconImage: {
    width: 24,
    height: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  modalCloseText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalImageContainer: {
    width: screenWidth,
    height: screenHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: screenWidth,
    height: screenHeight,
  },
});