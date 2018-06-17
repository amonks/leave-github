for user in ~/repositories/* ; do
  if [[ "$user" == *.git ]] ; then
    continue
  fi

  for repo in $user/* ; do
    if [[ "$repo" != *.git ]] ; then
      continue
    fi

    echo `echo $user | cut -d'/' -f 5` > $repo/gl-creator
  done

  for repo in $user/private/* ; do
    if [[ "$repo" != *.git ]] ; then
      continue
    fi

    echo `echo $user | cut -d'/' -f 5` > $repo/gl-creator
  done
done
