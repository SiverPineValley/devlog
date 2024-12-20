import React from 'react'
import { FacebookIcon } from './facebook-icon'
import { TwitterIcon } from './twitter-icon'
import { shareToTwitter, shareToFacebook } from '../../utils/share'

import './index.scss'

const metaConfig = require('../../../gatsby-meta-config')

export const SocialShare = ({ title, author }) => {
  const text = `Recommend on "${title}" written by @${author}`

  const onClickTwitterIcon = e => {
    e.preventDefault()

    return shareToTwitter(window.location.href, text)
  }

  const onClickFacebookIcon = e => {
    e.preventDefault()
    return shareToFacebook(window.location.href, text)
  }

  return (
    <div className="social-share">
      {!!metaConfig.share.facebookAppId && (
        <FacebookIcon onClick={onClickFacebookIcon} />
      )}
      <TwitterIcon onClick={onClickTwitterIcon} />
    </div>
  )
}
